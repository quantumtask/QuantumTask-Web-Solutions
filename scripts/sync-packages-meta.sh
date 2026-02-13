#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export ROOT

INDEX_FILE="${ROOT}/index.html"
SERVICES_JSON="${ROOT}/services.json"

if [[ ! -f "${INDEX_FILE}" ]]; then
  echo "sync-packages-meta: index.html not found at ${INDEX_FILE}" >&2
  exit 1
fi

if [[ ! -f "${SERVICES_JSON}" ]]; then
  echo "sync-packages-meta: services.json not found at ${SERVICES_JSON}" >&2
  exit 1
fi

node - <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT;
if (!root) {
  console.error('sync-packages-meta: ROOT env missing');
  process.exit(1);
}

const indexPath = path.join(root, 'index.html');
const servicesPath = path.join(root, 'services.json');

const indexHtml = fs.readFileSync(indexPath, 'utf8');

const pkgOpenMatch = indexHtml.match(/<section[^>]*id=["']packages["'][^>]*>/i);
if (!pkgOpenMatch) {
  console.error('sync-packages-meta: Packages section not found in index.html');
  process.exit(1);
}
const packageOpenTag = pkgOpenMatch[0].trim();

const metaMarker = '<div class="meta-grid qt-stagger">';

function extractDivBlock(html, startIndex) {
  const divRegex = /<div\b[^>]*>|<\/div>/gi;
  divRegex.lastIndex = startIndex;
  let depth = 0;
  let match;

  while ((match = divRegex.exec(html))) {
    if (match.index < startIndex) continue;
    if (match[0].startsWith('<div')) {
      depth += 1;
    } else {
      depth -= 1;
    }
    if (depth === 0) {
      const end = match.index + match[0].length;
      return html.slice(startIndex, end);
    }
  }

  throw new Error('Failed to balance <div> block starting at index ' + startIndex);
}

const metaStart = indexHtml.indexOf(metaMarker);
if (metaStart === -1) {
  console.error('sync-packages-meta: meta-grid block not found in index.html');
  process.exit(1);
}
const metaGridBlock = extractDivBlock(indexHtml, metaStart);

function extractTag(html, label, regex) {
  const match = html.match(regex);
  if (!match) {
    throw new Error(`Could not find ${label} in index.html`);
  }
  return match[0].trim();
}

const styleTag = extractTag(indexHtml, 'style.css link', /<link\s+rel="stylesheet"\s+href="style\.css[^"]*"\s*\/?>/i);
const siteCssTag = extractTag(indexHtml, 'assets/css/site.css link', /<link\s+rel="stylesheet"\s+href="assets\/css\/site\.css[^"]*"\s*\/?>/i);
const pricingScriptTag = extractTag(indexHtml, 'pricing-animate script', /<script\s+defer\s+src="assets\/js\/pricing-animate\.js[^"]*"><\/script>/i);

const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
const filenames = [...new Set(services.map((s) => s.filename).filter(Boolean))];

function findSectionBounds(html, openRegex) {
  const open = openRegex.exec(html);
  if (!open) return null;

  const start = open.index;
  const sectionRegex = /<\/?section\b[^>]*>/gi;
  sectionRegex.lastIndex = start;

  let depth = 0;
  let match;

  while ((match = sectionRegex.exec(html))) {
    if (match.index === start) {
      depth = 1;
      continue;
    }
    if (match[0][1] === '/') {
      depth -= 1;
    } else {
      depth += 1;
    }
    if (depth === 0) {
      const end = match.index + match[0].length;
      return { start, end };
    }
  }

  return null;
}

function replaceLinkTag(headHtml, regex, replacement, eol) {
  const match = headHtml.match(regex);
  if (match) {
    return headHtml.replace(regex, (full) => {
      const indentMatch = full.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      return indent + replacement;
    });
  }

  const closingHead = headHtml.lastIndexOf('</head>');
  if (closingHead === -1) throw new Error('Missing </head> tag');

  const needsNewline = headHtml.slice(0, closingHead).endsWith(eol) ? '' : eol;
  return headHtml.slice(0, closingHead) + needsNewline + '  ' + replacement + eol + headHtml.slice(closingHead);
}

function ensureScript(html, replacement, eol) {
  const regex = /<script\s+[^>]*src="assets\/js\/pricing-animate\.js[^"]*"><\/script>/i;
  if (regex.test(html)) {
    return html.replace(regex, (full) => {
      const indentMatch = full.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
      return indent + replacement;
    });
  }

  const closingBody = html.lastIndexOf('</body>');
  if (closingBody === -1) throw new Error('Missing </body> tag');

  const before = html.slice(0, closingBody);
  const after = html.slice(closingBody);
  const needsNewline = before.endsWith(eol) ? '' : eol;
  return before + needsNewline + '  ' + replacement + eol + after;
}

const errors = [];
const updates = [];

for (const filename of filenames) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) {
    errors.push({ file: filename, message: 'File listed in services.json not found' });
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const EOL = original.includes('\r\n') ? '\r\n' : '\n';
  const pkgOpenRegex = /<section[^>]*id=["']packages["'][^>]*>/i;
  const pkgMatch = pkgOpenRegex.exec(original);

  if (!pkgMatch) {
    errors.push({ file: filename, message: 'Packages section not found' });
    continue;
  }

  const bounds = findSectionBounds(original, pkgOpenRegex);
  if (!bounds) {
    errors.push({ file: filename, message: 'Unable to locate end of Packages section' });
    continue;
  }

  let pkgSection = original.slice(bounds.start, bounds.end);

  // Refresh opening tag
  pkgSection = pkgSection.replace(pkgOpenRegex, (full) => {
    const indentMatch = full.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    return indent + packageOpenTag;
  });

  // Meta-grid handling
  const metaBlockForFile = metaGridBlock.replace(/\r?\n/g, EOL);
  const metaPos = pkgSection.indexOf(metaMarker);

  if (metaPos !== -1) {
    const existingBlock = extractDivBlock(pkgSection, metaPos);
    pkgSection = pkgSection.slice(0, metaPos) + metaBlockForFile + pkgSection.slice(metaPos + existingBlock.length);
  } else {
    const gridPos = pkgSection.indexOf('<div class="grid-3">');
    if (gridPos === -1) {
      errors.push({ file: filename, message: 'Packages section missing grid-3 for meta-grid insertion' });
      continue;
    }

    const before = pkgSection.slice(0, gridPos);
    const after = pkgSection.slice(gridPos);
    const indentMatch = before.match(/([ \t]*)$/);
    const indent = indentMatch ? indentMatch[1] : '';
    const beforeTrimmed = before.slice(0, before.length - indent.length);
    const beforeWithLine = beforeTrimmed.endsWith(EOL) ? beforeTrimmed : beforeTrimmed + EOL;
    pkgSection = beforeWithLine + indent + metaBlockForFile + EOL + EOL + indent + after;
  }

  let html = original.slice(0, bounds.start) + pkgSection + original.slice(bounds.end);

  // Head includes
  const headStart = html.toLowerCase().indexOf('<head>');
  const headEnd = html.toLowerCase().indexOf('</head>');
  if (headStart === -1 || headEnd === -1 || headEnd < headStart) {
    errors.push({ file: filename, message: '<head> block not found' });
    continue;
  }

  const headContent = html.slice(headStart, headEnd + '</head>'.length);
  let newHead = headContent;
  newHead = replaceLinkTag(newHead, /<link\s+rel="stylesheet"\s+href="style\.css[^"]*"\s*\/?>/i, styleTag, EOL);
  newHead = replaceLinkTag(newHead, /<link\s+rel="stylesheet"\s+href="assets\/css\/site\.css[^"]*"\s*\/?>/i, siteCssTag, EOL);
  html = html.slice(0, headStart) + newHead + html.slice(headEnd + '</head>'.length);

  // pricing-animate script
  html = ensureScript(html, pricingScriptTag, EOL);

  updates.push({ file: filename, updated: html, changed: html !== original });
}

if (errors.length) {
  console.error('sync-packages-meta: encountered issues:');
  for (const err of errors) {
    console.error(`- ${err.file}: ${err.message}`);
  }
  process.exit(1);
}

for (const { file, updated, changed } of updates) {
  if (changed) {
    fs.writeFileSync(path.join(root, file), updated, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`No changes needed for ${file}`);
  }
}

console.log('sync-packages-meta: done');
NODE

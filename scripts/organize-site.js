const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = process.cwd();

const sourceDirs = [
  "mobile.quantumtask.io",
  "cdn.prod.website-files.com",
  "d3e54v103j8qbb.cloudfront.net",
];

const oldHtmlRel = "mobile.quantumtask.io/index.html";
const oldCssRel =
  "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/css/setrex-saas-template.webflow.shared.e4d26a7ba.css";

const targetHtmlRel = "index.html";
const targetCssRel = "assets/css/webflow.css";

const specialTargets = new Map([
  [oldHtmlRel, targetHtmlRel],
  [oldCssRel, targetCssRel],
  ["mobile.quantumtask.io/logo.png", "assets/images/logo.png"],
  ["mobile.quantumtask.io/logo_v=2.png", "assets/images/logo-variant-2.png"],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b%2F68bf3669f39313242f4e3e3b_Hero Video-poster-00001.jpg",
    "assets/images/hero-video-poster.jpg",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b%2F68bf3669f39313242f4e3e3b_Hero Video-transcode.mp4",
    "assets/video/hero-video.mp4",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b%2F68bf3669f39313242f4e3e3b_Hero Video-transcode.webm",
    "assets/video/hero-video.webm",
  ],
  [
    "cdn.prod.website-files.com/688d31d885372b14ca5e3d8b/6895ddc8596063c67f981615_White Menu.json",
    "assets/animations/menu-toggle-animation.json",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/68dcd6833e1b05dd95095d27_eed5223c568804161531e4150b644ec9_data.json",
    "assets/animations/lead-capture-animation.json",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/68dcd68c2c5cda3d5debbc51_data.json",
    "assets/animations/star-animation.json",
  ],
  [
    "d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8_site=68b6ff99deb8a7b82b41a88b.js",
    "assets/js/jquery.js",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/js/webflow.schunk.57d5559d2f0cd9f8.js",
    "assets/js/webflow-chunk-1.js",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/js/webflow.schunk.2fd6f70b71be0bfd.js",
    "assets/js/webflow-chunk-2.js",
  ],
  [
    "cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/js/webflow.05d72f76.d8670bbd5a5cbfef.js",
    "assets/js/webflow-main.js",
  ],
]);

const specialBaseNames = new Map([
  [
    "68dcd6833e1b05dd95095d27_eed5223c568804161531e4150b644ec9_data.json",
    "lead-capture-animation",
  ],
  ["68dcd68c2c5cda3d5debbc51_data.json", "star-animation"],
  ["6895ddc8596063c67f981615_White Menu.json", "menu-toggle-animation"],
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function extGroup(ext) {
  switch (ext.toLowerCase()) {
    case ".css":
      return "css";
    case ".js":
      return "js";
    case ".json":
      return "animations";
    case ".ttf":
    case ".otf":
    case ".woff":
    case ".woff2":
      return "fonts";
    case ".mp4":
    case ".webm":
    case ".mov":
      return "video";
    case ".svg":
      return "icons";
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".avif":
    case ".webp":
      return "images";
    default:
      return "misc";
  }
}

function decodeFsSegment(segment) {
  const slashToken = "__PERCENT_SLASH__";
  const safe = segment.replace(/%2F/gi, slashToken);
  return decodeURIComponent(safe).replaceAll(slashToken, "%2F");
}

function logicalBaseName(fileName) {
  const decoded = decodeFsSegment(fileName);
  return decoded.split("/").pop();
}

function cleanName(baseName) {
  let cleaned = baseName;
  while (/^[0-9a-f]{16,}[_-]/i.test(cleaned)) {
    cleaned = cleaned.replace(/^[0-9a-f]{16,}[_-]+/i, "");
  }

  cleaned = cleaned.replace(/-BF[0-9a-f]+$/i, "");
  cleaned = cleaned.replace(/\bAvater\b/gi, "Avatar");
  cleaned = cleaned.replace(/\bSHadow\b/g, "Shadow");
  cleaned = cleaned.replace(/_/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function buildGenericTarget(relPath) {
  const fileName = path.basename(relPath);
  const extension = path.extname(fileName).toLowerCase();
  const group = extGroup(extension);
  const logicalName = logicalBaseName(fileName);
  const withoutExt = logicalName.slice(
    0,
    logicalName.length - extension.length,
  );
  const specialBase = specialBaseNames.get(logicalName);
  const readableBase = specialBase || slugify(cleanName(withoutExt));
  return `assets/${group}/${readableBase}${extension}`;
}

function uniqueTarget(targetRel, usedTargets) {
  const posixTarget = toPosix(targetRel);
  if (!usedTargets.has(posixTarget)) {
    usedTargets.add(posixTarget);
    return posixTarget;
  }

  const parsed = path.posix.parse(posixTarget);
  let index = 2;
  let candidate = `${parsed.dir}/${parsed.name}-${index}${parsed.ext}`;

  while (usedTargets.has(candidate)) {
    index += 1;
    candidate = `${parsed.dir}/${parsed.name}-${index}${parsed.ext}`;
  }

  usedTargets.add(candidate);
  return candidate;
}

async function listFilesRecursively(dirPath) {
  const results = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursively(fullPath)));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

function splitSuffix(urlValue) {
  const match = urlValue.match(/^([^?#]*)(.*)$/);
  return {
    filePart: match ? match[1] : urlValue,
    suffix: match ? match[2] : "",
  };
}

function resolveQueryVariant(resolvedPath, suffix) {
  if (!suffix.startsWith("?site=")) {
    return null;
  }

  const siteId = suffix.slice("?site=".length);
  const parsed = path.parse(resolvedPath);
  return path.join(parsed.dir, `${parsed.name}_site=${siteId}${parsed.ext}`);
}

function resolveLocalUrl(sourceDocAbs, rawUrl) {
  const { filePart } = splitSuffix(rawUrl);

  if (
    !filePart ||
    filePart.startsWith("http://") ||
    filePart.startsWith("https://") ||
    filePart.startsWith("data:") ||
    filePart.startsWith("mailto:") ||
    filePart.startsWith("tel:") ||
    filePart.startsWith("javascript:") ||
    filePart.startsWith("#") ||
    filePart.startsWith("/")
  ) {
    return null;
  }

  const segments = filePart.split("/").map((segment) => {
    if (segment === "." || segment === ".." || segment === "") {
      return segment;
    }
    return decodeFsSegment(segment);
  });

  return path.resolve(path.dirname(sourceDocAbs), ...segments);
}

function rewriteSingleUrl(rawUrl, sourceDocAbs, targetDocAbs, mapping) {
  const { suffix } = splitSuffix(rawUrl);
  const resolved = resolveLocalUrl(sourceDocAbs, rawUrl);
  if (!resolved) {
    return rawUrl;
  }

  const targetAssetAbs =
    mapping.get(resolved) || mapping.get(resolveQueryVariant(resolved, suffix));
  if (!targetAssetAbs) {
    return rawUrl;
  }

  return toPosix(path.relative(path.dirname(targetDocAbs), targetAssetAbs));
}

function rewriteHtmlAttributes(content, sourceDocAbs, targetDocAbs, mapping) {
  const supportedAttrs = new Set([
    "src",
    "href",
    "data-src",
    "content",
    "poster",
    "style",
    "data-poster-url",
    "data-video-urls",
    "srcset",
  ]);

  return content.replace(
    /([a-zA-Z:-]+)="([^"]*)"/g,
    (match, attrName, attrValue) => {
      const lowerAttr = attrName.toLowerCase();
      if (!supportedAttrs.has(lowerAttr)) {
        return match;
      }

      let nextValue = attrValue;

      if (lowerAttr === "style") {
        nextValue = attrValue.replace(
          /url\((['"]?)([^'")]+)\1\)/g,
          (styleMatch, quote, rawUrl) => {
            const rewrittenUrl = rewriteSingleUrl(
              rawUrl,
              sourceDocAbs,
              targetDocAbs,
              mapping,
            );
            if (rewrittenUrl === rawUrl) {
              return styleMatch;
            }

            return `url(${quote}${rewrittenUrl}${quote})`;
          },
        );
      } else if (lowerAttr === "data-video-urls") {
        nextValue = attrValue
          .split(",")
          .map((part) =>
            rewriteSingleUrl(part.trim(), sourceDocAbs, targetDocAbs, mapping),
          )
          .join(",");
      } else if (lowerAttr === "srcset") {
        nextValue = attrValue
          .split(",")
          .map((entry) => {
            const trimmed = entry.trim();
            if (!trimmed) {
              return trimmed;
            }

            const [urlPart, ...descriptorParts] = trimmed.split(/\s+/);
            const rewrittenUrl = rewriteSingleUrl(
              urlPart,
              sourceDocAbs,
              targetDocAbs,
              mapping,
            );
            return [rewrittenUrl, ...descriptorParts].join(" ").trim();
          })
          .join(", ");
      } else {
        nextValue = rewriteSingleUrl(
          attrValue,
          sourceDocAbs,
          targetDocAbs,
          mapping,
        );
      }

      return nextValue === attrValue ? match : `${attrName}="${nextValue}"`;
    },
  );
}

function rewriteCssUrls(content, sourceDocAbs, targetDocAbs, mapping) {
  return content.replace(
    /url\((['"]?)([^'")]+)\1\)/g,
    (match, quote, rawUrl) => {
      if (rawUrl.startsWith("data:")) {
        return match;
      }

      const rewrittenUrl = rewriteSingleUrl(
        rawUrl,
        sourceDocAbs,
        targetDocAbs,
        mapping,
      );
      if (rewrittenUrl === rawUrl) {
        return match;
      }

      return `url(${quote}${rewrittenUrl}${quote})`;
    },
  );
}

function rewriteSinglePageLinks(content) {
  const directRewrites = new Map([
    ['href="/"', 'href="#top"'],
    ['href="/home-02"', 'href="#services"'],
    ['href="/about"', 'href="#why-sites-fail"'],
    ['href="/features"', 'href="#how-it-works"'],
    ['href="/pricing"', 'href="#pricing"'],
    ['href="#Pricing"', 'href="#pricing"'],
    ['href="/blog"', 'href="#demos"'],
    ['href="/contact"', 'href="#contact"'],
    ['href="/career"', 'href="#services"'],
    [
      'href="https://metrilo.webflow.io/career/digital-marketing-specialist"',
      'href="#services"',
    ],
    [
      'href="https://metrilo.webflow.io/integration/overlay"',
      'href="#services"',
    ],
    [
      'href="https://metrilo.webflow.io/blog/how-to-leverage-data-to-make-smarter-decisions"',
      'href="#services"',
    ],
    ['href="/privacy-policy"', 'href="#legal"'],
    ['href="/terms-condition"', 'href="#legal"'],
    ['href="/utility-pages/style-guide"', 'href="#legal"'],
    ['href="/utility-pages/license"', 'href="#legal"'],
    ['href="/utility-pages/changelog"', 'href="#legal"'],
    ['href="/404"', 'href="#legal"'],
    ['href="/401"', 'href="#legal"'],
    [
      'href="/blog/how-to-build-processes-and-systems-that-create-a-data-driven-culture"',
      'href="#demos"',
    ],
    [
      'href="/blog/creating-a-data-driven-organization-systems-processes"',
      'href="#demos"',
    ],
    [
      'href="/blog/building-a-culture-where-data-drives-every-decision"',
      'href="#demos"',
    ],
  ]);

  let nextContent = content;

  for (const [from, to] of directRewrites) {
    nextContent = nextContent.split(from).join(to);
  }

  return nextContent
    .split('href="/integration" class="button-03 w-inline-block"')
    .join('href="#demos" class="button-03 w-inline-block"')
    .split('href="/integration" class="dropdown-menu w-inline-block"')
    .join('href="#contact" class="dropdown-menu w-inline-block"')
    .split('href="/integration" class="paragraph-02 footer-link"')
    .join('href="#contact" class="paragraph-02 footer-link"');
}

function addSinglePageAnchors(content) {
  const markerToReplacement = new Map([
    [
      "</style><style>@media",
      ".section-anchor{display:block;position:relative;top:-96px;visibility:hidden}html{scroll-behavior:smooth}</style><style>@media",
    ],
    [
      '<div class="page-wrapper">',
      '<div class="page-wrapper"><!-- Top / Hero --><div id="top" class="section-anchor" aria-hidden="true"></div>',
    ],
    [
      '<section class="intro">',
      '<!-- Services --><div id="services" class="section-anchor" aria-hidden="true"></div><section class="intro">',
    ],
    [
      '<section class="capabilities">',
      '<!-- Why Sites Fail / How It Works --><div id="why-sites-fail" class="section-anchor" aria-hidden="true"></div><div id="how-it-works" class="section-anchor" aria-hidden="true"></div><section class="capabilities">',
    ],
    [
      '<section id="Pricing" class="pricing-v2">',
      '<!-- Pricing --><div id="pricing" class="section-anchor" aria-hidden="true"></div><section id="Pricing" class="pricing-v2">',
    ],
    [
      '<section class="faq">',
      '<!-- FAQ --><div id="faq" class="section-anchor" aria-hidden="true"></div><section class="faq">',
    ],
    [
      '<section class="blog-v2">',
      '<!-- Demos --><div id="demos" class="section-anchor" aria-hidden="true"></div><section class="blog-v2">',
    ],
    [
      '<section data-wf--cta-v1--variant="base" class="cta-v1">',
      '<!-- Contact / Quote --><div id="contact" class="section-anchor" aria-hidden="true"></div><div id="quote" class="section-anchor" aria-hidden="true"></div><section data-wf--cta-v1--variant="base" class="cta-v1">',
    ],
    [
      '<section class="footer">',
      '<!-- Legal --><div id="legal" class="section-anchor" aria-hidden="true"></div><section class="footer">',
    ],
  ]);

  let nextContent = content;

  for (const [marker, replacement] of markerToReplacement) {
    nextContent = nextContent.replace(marker, replacement);
  }

  return nextContent;
}

async function ensureCleanTarget(targetRel) {
  const targetAbs = path.join(rootDir, targetRel);
  try {
    await fs.access(targetAbs);
    throw new Error(`Refusing to overwrite existing path: ${targetRel}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function main() {
  for (const targetRel of ["index.html", "assets", "asset-map.json"]) {
    await ensureCleanTarget(targetRel);
  }

  const sourceFiles = [];
  for (const sourceDir of sourceDirs) {
    const fullDir = path.join(rootDir, sourceDir);
    sourceFiles.push(...(await listFilesRecursively(fullDir)));
  }

  sourceFiles.sort((a, b) => a.localeCompare(b));

  const usedTargets = new Set();
  const mapping = new Map();
  const assetMap = {};

  for (const sourceAbs of sourceFiles) {
    const relPath = toPosix(path.relative(rootDir, sourceAbs));
    const targetRel = uniqueTarget(
      specialTargets.get(relPath) || buildGenericTarget(relPath),
      usedTargets,
    );
    const targetAbs = path.join(rootDir, ...targetRel.split("/"));
    mapping.set(sourceAbs, targetAbs);
    assetMap[relPath] = targetRel;
  }

  for (const [sourceAbs, targetAbs] of mapping.entries()) {
    if (
      sourceAbs === path.join(rootDir, oldHtmlRel) ||
      sourceAbs === path.join(rootDir, oldCssRel)
    ) {
      continue;
    }

    await fs.mkdir(path.dirname(targetAbs), { recursive: true });
    await fs.copyFile(sourceAbs, targetAbs);
  }

  const oldHtmlAbs = path.join(rootDir, oldHtmlRel);
  const newHtmlAbs = path.join(rootDir, targetHtmlRel);
  let htmlContent = await fs.readFile(oldHtmlAbs, "utf8");
  htmlContent = rewriteHtmlAttributes(
    htmlContent,
    oldHtmlAbs,
    newHtmlAbs,
    mapping,
  );
  htmlContent = rewriteCssUrls(htmlContent, oldHtmlAbs, newHtmlAbs, mapping);
  htmlContent = rewriteSinglePageLinks(htmlContent);
  htmlContent = addSinglePageAnchors(htmlContent);
  await fs.writeFile(newHtmlAbs, htmlContent, "utf8");

  const oldCssAbs = path.join(rootDir, oldCssRel);
  const newCssAbs = path.join(rootDir, targetCssRel);
  let cssContent = await fs.readFile(oldCssAbs, "utf8");
  cssContent = rewriteCssUrls(cssContent, oldCssAbs, newCssAbs, mapping);
  await fs.mkdir(path.dirname(newCssAbs), { recursive: true });
  await fs.writeFile(newCssAbs, cssContent, "utf8");

  await fs.writeFile(
    path.join(rootDir, "asset-map.json"),
    `${JSON.stringify(assetMap, null, 2)}\n`,
    "utf8",
  );

  for (const sourceDir of sourceDirs) {
    await fs.rm(path.join(rootDir, sourceDir), {
      recursive: true,
      force: true,
    });
  }

  console.log("Site reorganized into root files and assets/.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

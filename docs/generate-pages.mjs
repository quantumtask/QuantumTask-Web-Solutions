import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const cwd = process.cwd();
const SERVICES_PATH = path.join(cwd, 'services.json');
const TEMPLATE_PATH = path.join(cwd, 'index.html');
const SITEMAP_PATH = path.join(cwd, 'sitemap.xml');
const ROBOTS_PATH = path.join(cwd, 'robots.txt');
const IMAGES_DIR = path.join(cwd, 'images');

const gradient = 'linear-gradient(135deg,rgba(2,6,23,.96) 0%,rgba(15,23,42,.85) 50%,rgba(2,6,23,.92) 100%)';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function replaceOne(html, regex, replacement, label) {
  if (!regex.test(html)) {
    console.warn(`Warning: could not find ${label} to replace.`);
    return html;
  }
  return html.replace(regex, replacement);
}

function listItems(items) {
  return items.map(item => `<li>${item}</li>`).join('');
}

function faqItems(faq) {
  return faq.map(f => `<div class="card faq-item"><h3>${f.q}</h3><p>${f.a}</p></div>`).join('');
}

function otherTradesLinks(services, current) {
  return services
    .filter(s => s.slug !== current.slug)
    .map(s => `<a class="pill-soft" href="${s.filename}">${s.tradeDisplay}</a>`)
    .join('\n        ');
}

function buildUniqueBlock(svc, services) {
  // Keep short proof items readable with clear separators
  const proof = svc.shortProof.join(' · ');
  return `
<section class="section section-alt service-unique">
  <div class="section-inner">
    <div class="section-header">
      <span class="section-label">Problems we solve for ${svc.tradeDisplay}</span>
      <h2>Built to win more ${svc.tradeDisplay.toLowerCase()} work</h2>
      <p class="section-intro">${proof}</p>
    </div>
    <div class="grid-3 service-unique-grid">
      <div class="card">
        <h3>Problems we solve</h3>
        <ul class="price-list">
          ${listItems(svc.painPoints)}
        </ul>
      </div>
      <div class="card">
        <h3>What you get</h3>
        <ul class="price-list included-list">
          ${listItems(svc.offerBullets)}
        </ul>
      </div>
      <div class="card">
        <h3>FAQ for ${svc.tradeDisplay}</h3>
        <div class="faq-grid">
          ${faqItems(svc.faq)}
        </div>
      </div>
    </div>
    <div class="pill-row other-trades" style="margin-top:1.5rem;">
      ${otherTradesLinks(services, svc)}
    </div>
  </div>
</section>`;
}

function buildPage(template, svc, services) {
  let html = template;
  const url = `https://quantumtask.io/${svc.filename}`;

  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${svc.pageTitle}</title>`, 'title');
  html = replaceOne(html, /<meta name="description" content="[\s\S]*?" \/>/, `<meta name="description" content="${svc.metaDescription}" />`, 'meta description');
  html = replaceOne(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical');
  html = replaceOne(html, /<meta property="og:title" content="[\s\S]*?" \/>/, `<meta property="og:title" content="${svc.pageTitle}" />`, 'og:title');
  html = replaceOne(html, /<meta property="og:description" content="[\s\S]*?" \/>/, `<meta property="og:description" content="${svc.metaDescription}" />`, 'og:description');
  html = replaceOne(html, /<meta property="og:url" content="[\s\S]*?" \/>/, `<meta property="og:url" content="${url}" />`, 'og:url');
  html = replaceOne(html, /<meta name="twitter:title" content="[\s\S]*?" \/>/, `<meta name="twitter:title" content="${svc.pageTitle}" />`, 'twitter:title');
  html = replaceOne(html, /<meta name="twitter:description" content="[\s\S]*?" \/>/, `<meta name="twitter:description" content="${svc.metaDescription}" />`, 'twitter:description');

  html = replaceOne(html, /<h1 class="hero-title">[\s\S]*?<\/h1>/, `<h1 class="hero-title">${svc.h1}</h1>`, 'hero title');
  html = replaceOne(html, /<p class="hero-sub">[\s\S]*?<\/p>/, `<p class="hero-sub">${svc.heroSub}</p>`, 'hero sub');

  const bgStyle = `background:${gradient}, url('${svc.heroImage}') center right/cover no-repeat;`;
  html = replaceOne(html, /<div class="hero-bg">\s*<\/div>/, `<div class="hero-bg" style="${bgStyle}"></div>`, 'hero bg');

  const metaPill = `<div class="meta-pill">\n            <span class="meta-label">${svc.metaLabel}</span>\n            <span class="meta-list">${svc.metaList}</span>\n          </div>`;
  html = replaceOne(html, /<div class="meta-pill">[\s\S]*?<\/div>/, metaPill, 'meta pill');

  // Service pages shouldn't inherit the home-only styling hooks
  html = replaceOne(html, /<body class="page-home">/, '<body>', 'body class');
  html = replaceOne(html, /<section class="hero hero--home">/, '<section class="hero">', 'hero class');

  const uniqueBlock = buildUniqueBlock(svc, services);
  html = replaceOne(html, /<!--SERVICE_UNIQUE_BLOCK-->/, uniqueBlock, 'service unique block');

  return html;
}

function writeSitemap(services) {
  const today = new Date().toISOString().split('T')[0];
  const staticPages = [
    'https://quantumtask.io/terms.html',
    'https://quantumtask.io/privacy.html',
    'https://quantumtask.io/cookies.html',
    'https://quantumtask.io/service-terms.html'
  ];
  const urls = [
    { loc: 'https://quantumtask.io/', lastmod: today },
    ...services.map(s => ({ loc: `https://quantumtask.io/${s.filename}`, lastmod: today })),
    ...staticPages.map(loc => ({ loc, lastmod: today }))
  ];
  const body = urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
  return SITEMAP_PATH;
}

function writeRobots() {
  const robots = `User-agent: *\nAllow: /\nSitemap: https://quantumtask.io/sitemap.xml\n`;
  fs.writeFileSync(ROBOTS_PATH, robots, 'utf8');
  return ROBOTS_PATH;
}

function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

function main() {
  const services = readJson(SERVICES_PATH);
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  ensureImagesDir();

  const written = [];

  for (const svc of services) {
    const html = buildPage(template, svc, services);
    fs.writeFileSync(path.join(cwd, svc.filename), html, 'utf8');
    written.push(svc.filename);
  }

  written.push(writeSitemap(services));
  written.push(writeRobots());

  console.log('Files written:');
  written.forEach(f => console.log(' -', path.relative(cwd, f)));

  try {
    const status = execSync('git status --short', { stdio: 'pipe' }).toString();
    console.log('\nGit status:');
    console.log(status || '(clean)');
  } catch (err) {
    console.warn('\nGit status unavailable:', err.message.trim());
  }

  console.log('\nSummary: updated service pages, sitemap, and robots.txt from services.json.');
}

main();

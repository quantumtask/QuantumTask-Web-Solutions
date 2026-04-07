const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

const remoteUrls = {
  html: "https://mobile.quantumtask.io/",
  css: "https://cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/css/setrex-saas-template.webflow.shared.e4d26a7ba.css",
  jquery:
    "https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=68b6ff99deb8a7b82b41a88b",
  chunk1:
    "https://cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/js/webflow.schunk.57d5559d2f0cd9f8.js",
  chunk2:
    "https://cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/js/webflow.schunk.2fd6f70b71be0bfd.js",
  main: "https://cdn.prod.website-files.com/68b6ff99deb8a7b82b41a88b/js/webflow.05d72f76.d8670bbd5a5cbfef.js",
};

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function replaceMany(content, replacements) {
  const ordered = [...replacements].sort((a, b) => b[0].length - a[0].length);
  let nextContent = content;

  for (const [from, to] of ordered) {
    nextContent = nextContent.split(from).join(to);
  }

  return nextContent;
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function buildHtmlAssetReplacements(assetMap) {
  const replacements = [];

  for (const [sourceRel, targetRel] of Object.entries(assetMap)) {
    if (
      sourceRel.startsWith("mobile.quantumtask.io/") ||
      targetRel === "index.html" ||
      targetRel === "assets/css/webflow.css"
    ) {
      continue;
    }

    const encodedSource = sourceRel.replace(/ /g, "%20");
    replacements.push([`https://${sourceRel}`, targetRel]);
    replacements.push([`https://${encodedSource}`, targetRel]);
  }

  replacements.push([remoteUrls.css, "assets/css/webflow.css"]);
  replacements.push([remoteUrls.jquery, "assets/js/jquery.js"]);
  replacements.push([remoteUrls.chunk1, "assets/js/webflow-chunk-1.js"]);
  replacements.push([remoteUrls.chunk2, "assets/js/webflow-chunk-2.js"]);
  replacements.push([remoteUrls.main, "assets/js/webflow-main.js"]);
  replacements.push(['href="./logo.png?v=2"', 'href="assets/images/logo.png"']);
  replacements.push(['background:url("logo.png")', 'background:url("assets/images/logo.png")']);
  replacements.push([
    'background:url("logo.png") center/contain no-repeat',
    'background:url("assets/images/logo.png") center/contain no-repeat',
  ]);

  return replacements;
}

function buildCssAssetReplacements(assetMap) {
  const replacements = [];

  for (const [sourceRel, targetRel] of Object.entries(assetMap)) {
    if (
      sourceRel.startsWith("mobile.quantumtask.io/") ||
      targetRel === "index.html" ||
      targetRel === "assets/css/webflow.css"
    ) {
      continue;
    }

    const encodedSource = sourceRel.replace(/ /g, "%20");
    const cssRelativeTarget = toPosix(path.posix.relative("assets/css", targetRel));
    replacements.push([`https://${sourceRel}`, cssRelativeTarget]);
    replacements.push([`https://${encodedSource}`, cssRelativeTarget]);
  }

  return replacements;
}

async function main() {
  const assetMapPath = path.join(rootDir, "asset-map.json");
  const assetMap = JSON.parse(await fs.readFile(assetMapPath, "utf8"));

  const [html, css, jquery, chunk1, chunk2, mainJs] = await Promise.all([
    fetchText(remoteUrls.html),
    fetchText(remoteUrls.css),
    fetchText(remoteUrls.jquery),
    fetchText(remoteUrls.chunk1),
    fetchText(remoteUrls.chunk2),
    fetchText(remoteUrls.main),
  ]);

  const htmlContent = addSinglePageAnchors(
    rewriteSinglePageLinks(
      replaceMany(html, buildHtmlAssetReplacements(assetMap)),
    ),
  );
  const cssContent = replaceMany(css, buildCssAssetReplacements(assetMap));

  await fs.writeFile(path.join(rootDir, "index.html"), htmlContent, "utf8");
  await fs.writeFile(path.join(rootDir, "assets/css/webflow.css"), cssContent, "utf8");
  await fs.writeFile(path.join(rootDir, "assets/js/jquery.js"), jquery, "utf8");
  await fs.writeFile(path.join(rootDir, "assets/js/webflow-chunk-1.js"), chunk1, "utf8");
  await fs.writeFile(path.join(rootDir, "assets/js/webflow-chunk-2.js"), chunk2, "utf8");
  await fs.writeFile(path.join(rootDir, "assets/js/webflow-main.js"), mainJs, "utf8");

  console.log("Live site synced into local assets.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVICES_JSON="${ROOT}/services.json"

if [[ ! -f "${SERVICES_JSON}" ]]; then
  echo "verify-packages-meta: services.json not found at ${SERVICES_JSON}" >&2
  exit 1
fi

node - <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const servicesPath = path.join(root, 'services.json');

const services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
const filenames = [...new Set(services.map((s) => s.filename).filter(Boolean))];

const checks = [
  {
    label: 'Packages section tag',
    test: (content) => content.includes('<section id="packages" class="section section-alt" data-pack-section>')
  },
  {
    label: 'meta-grid block',
    test: (content) => content.includes('<div class="meta-grid qt-stagger">')
  },
  {
    label: 'meta-card--trust',
    test: (content) => content.includes('meta-card--trust')
  },
  {
    label: 'meta-card--payment',
    test: (content) => content.includes('meta-card--payment')
  },
  {
    label: 'meta-card--intro',
    test: (content) => content.includes('meta-card--intro')
  },
  {
    label: 'pricing-animate script',
    test: (content) => content.includes('assets/js/pricing-animate.js')
  },
  {
    label: 'style.css link',
    test: (content) => content.includes('style.css')
  },
  {
    label: 'assets/css/site.css link',
    test: (content) => content.includes('assets/css/site.css')
  }
];

function fail(file, reason) {
  console.error(`${file}: ${reason}`);
  process.exit(1);
}

for (const filename of filenames) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) {
    fail(filename, 'file not found (listed in services.json)');
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const check of checks) {
    if (!check.test(content)) {
      fail(filename, `missing ${check.label}`);
    }
  }
}

console.log('PASS');
NODE

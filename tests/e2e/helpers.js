// Shared setup for browser tests: a static file server for the repo and a Chromium page factory.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

async function setup() {
  const server = await startServer();
  const browser = await chromium.launch();
  return {
    url: server.url,
    // A fresh context per page: no shared localStorage. Console errors are collected in `errors`.
    async page({ width = 1400, height = 1000, hash = '' } = {}, context) {
      const ctx = context || (await browser.newContext({ viewport: { width, height } }));
      const page = await ctx.newPage();
      page.errors = [];
      page.on('pageerror', (e) => page.errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()));
      await page.goto(server.url + (hash ? `#${hash}` : ''));
      return page;
    },
    newContext: (opts = {}) => browser.newContext({ viewport: { width: 1400, height: 1000 }, ...opts }),
    async close() {
      await browser.close();
      await server.close();
    },
  };
}

// Helpers that read app state from the page.
const shareState = (page) =>
  page.evaluate(() => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(location.hash.slice(1)), (c) => c.charCodeAt(0)))));
const keyFill = (page, id) => page.$eval(`#preview .key[data-id="${id}"] rect:nth-of-type(2)`, (el) => el.getAttribute('fill'));
const bomTotal = (page) => page.$$eval('.bom-total', (xs) => xs.reduce((n, x) => n + parseInt(x.textContent, 10), 0));
const pressedLayout = (page) => page.$eval('.layout-btn[aria-pressed="true"]', (x) => x.dataset.id);
const inputValue = (page, selector) => page.$eval(selector, (x) => x.value);
const keyIds = (page, layoutId, labels) =>
  page.evaluate(([id, ls]) => window.KC.layouts.byId[id].keys.filter((k) => ls.includes(k.l)).map((k) => k.id), [layoutId, labels]);

module.exports = { setup, shareState, keyFill, bomTotal, pressedLayout, inputValue, keyIds };

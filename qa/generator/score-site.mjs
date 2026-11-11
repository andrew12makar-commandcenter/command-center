#!/usr/bin/env node
// Score a rendered site directory.
// Usage: node qa/generator/score-site.mjs <site-directory> [--no-browser] [--out file.json]
import {createServer} from 'node:http';
import {access, readFile, writeFile} from 'node:fs/promises';
import {extname, join, normalize, resolve} from 'node:path';
import {BROWSER_PROBE, scoreSiteDirectory} from './score-lib.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

function serve(root) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      let relative = decodeURIComponent(url.pathname);
      relative = relative === '/' ? 'index.html' : relative.replace(/^[/\\]+/, '');
      const path = normalize(join(root, relative));
      if (path !== root && !path.startsWith(root + '/')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const body = await readFile(path);
      res.writeHead(200, {'content-type': MIME[extname(path).toLowerCase()] || 'application/octet-stream'});
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      done({server, port: address.port});
    });
  });
}

async function measure(dir) {
  const {chromium} = await import('@playwright/test');
  const {server, port} = await serve(dir);
  const browser = await chromium.launch({
    executablePath: process.env.QA_CHROMIUM_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu', '--no-zygote'],
  });
  try {
    const page = await browser.newPage({
      viewport: {width: 390, height: 844},
      reducedMotion: 'reduce',
    });
    const transfers = {htmlBytes: 0, cssBytes: 0, jsBytes: 0, fontBytes: 0, imageBytes: 0, remoteFontStylesheets: 0};
    page.on('response', async (response) => {
      try {
        const type = (response.headers()['content-type'] || '').toLowerCase();
        const url = response.url();
        if (/fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net/.test(url)) transfers.remoteFontStylesheets += 1;
        const length = Number(response.headers()['content-length']) || (await response.body()).length;
        if (type.includes('text/html')) transfers.htmlBytes += length;
        else if (type.includes('text/css')) transfers.cssBytes += length;
        else if (type.includes('javascript')) transfers.jsBytes += length;
        else if (type.includes('font') || url.endsWith('.woff2') || url.endsWith('.woff')) transfers.fontBytes += length;
        else if (type.startsWith('image/')) transfers.imageBytes += length;
      } catch {
        // A failed body read does not invent a size.
      }
    });
    await page.goto(`http://127.0.0.1:${port}/index.html`, {waitUntil: 'networkidle'});
    const probe = await page.evaluate(BROWSER_PROBE);
    const html = await page.content();
    transfers.viewport = /name=["']viewport["']/i.test(html);
    transfers.source = 'playwright-transfer';
    return {overflow: {...probe.overflow, width: 390}, contrast: probe.contrast, transfers};
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }
}

function args(argv) {
  const out = {dir: null, browser: true, out: null};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--no-browser') out.browser = false;
    else if (token === '--out') out.out = argv[++i];
    else if (!token.startsWith('--') && !out.dir) out.dir = token;
    else throw new Error('Unknown argument ' + token);
  }
  if (!out.dir) throw new Error('Usage: node qa/generator/score-site.mjs <site-directory> [--no-browser] [--out file.json]');
  return out;
}

export async function main(argv = process.argv.slice(2)) {
  const options = args(argv);
  const dir = resolve(options.dir);
  let measurements = {};
  if (options.browser) {
    try {
      const measured = await measure(dir);
      measurements = {overflow: measured.overflow, contrast: measured.contrast};
      const manifestPath = join(dir, 'network-manifest.json');
      try {
        await access(manifestPath);
      } catch {
        await writeFile(manifestPath, JSON.stringify(measured.transfers, null, 2) + '\n');
      }
    } catch (error) {
      measurements.browserError = error instanceof Error ? error.message : String(error);
    }
  }
  const report = await scoreSiteDirectory(dir, measurements);
  if (measurements.browserError) report.browserError = measurements.browserError;
  const json = JSON.stringify(report, null, 2);
  if (options.out) await writeFile(resolve(options.out), json + '\n');
  console.log(json);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

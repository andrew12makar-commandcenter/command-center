#!/usr/bin/env node
// Render the production SiteRenderer for the example-data barbershop.
// This does not call the client export gate and does not set owner_approved.
// The audit harness adds the internal-concept banner and noindex. The generator
// itself does not render that sentence.
import {execSync, spawn} from 'node:child_process';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildExampleBlueprint, buildExampleLoop} from './example-business.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outRoot = join(root, 'qa', 'generator', 'output');
const copied = {
  'components/site-renderer.tsx': 'components/site-renderer.tsx',
  'components/site-industry-sections.tsx': 'components/site-industry-sections.tsx',
  'lib/site-blueprint.ts': 'lib/site-blueprint.ts',
  'lib/business-classification.ts': 'lib/business-classification.ts',
  'lib/business-specific-copy.ts': 'lib/business-specific-copy.ts',
  'lib/site-section-order.ts': 'lib/site-section-order.ts',
  'lib/site-presentation.ts': 'lib/site-presentation.ts',
  'lib/site-media-selection.ts': 'lib/site-media-selection.ts',
  'lib/reviewed-business-features.ts': 'lib/reviewed-business-features.ts',
  'lib/site-evaluation.ts': 'lib/site-evaluation.ts',
  'lib/demo-engine.ts': 'lib/demo-engine.ts',
  'lib/concept-imagery.ts': 'lib/concept-imagery.ts',
  'lib/research-intelligence.ts': 'lib/research-intelligence.ts',
  'lib/web-presence.ts': 'lib/web-presence.ts',
  'styles/site-motion.css': 'styles/site-motion.css',
};

const BANNER = 'Internal concept, not endorsed by the business. Example data. Not a real barbershop.';

function run(command, args, cwd) {
  return new Promise((done, reject) => {
    const child = spawn(command, args, {cwd, stdio: 'inherit', env: {...process.env, NEXT_TELEMETRY_DISABLED: '1'}});
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? done() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`))));
  });
}

async function waitFor(url, child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('Preview server exited early.');
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server still starting.
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Preview server did not start.');
}

export async function renderExample() {
  const built = buildExampleBlueprint();
  const loop = buildExampleLoop();
  const preview = join(tmpdir(), `l1-example-preview-${process.pid}`);
  await rm(preview, {recursive: true, force: true});
  await mkdir(preview, {recursive: true});
  for (const [dest, source] of Object.entries(copied)) {
    await mkdir(dirname(join(preview, dest)), {recursive: true});
    await cp(join(root, source), join(preview, dest));
  }
  await writeFile(join(preview, 'site-blueprint.json'), JSON.stringify(built.site, null, 2) + '\n');
  await mkdir(join(preview, 'app'), {recursive: true});
  await writeFile(join(preview, 'app', 'globals.css'), '@import "tailwindcss";\n@import "../styles/site-motion.css";\n');
  await writeFile(join(preview, 'app', 'layout.tsx'), `import type {Metadata} from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Example Data Barbers — example data',
  description: 'Example data. Internal concept, not endorsed by the business.',
  robots: {index: false, follow: false},
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body className="m-0 min-h-screen antialiased">{children}</body></html>;
}
`);
  await writeFile(join(preview, 'app', 'page.tsx'), `import SiteRenderer from '@/components/site-renderer';
import data from '@/site-blueprint.json';
import type {SiteBlueprint} from '@/lib/site-blueprint';
import {getMatchedConceptSet} from '@/lib/concept-imagery';
export default function Home() {
  const site = data as unknown as SiteBlueprint;
  return <>
    <p role="note" data-audit-harness="banner" style={{margin:0,padding:'12px 16px',background:'#241e1a',color:'#f6f1e8',textAlign:'center',font:'600 14px/1.4 system-ui,sans-serif'}}>${BANNER}</p>
    <SiteRenderer standalone site={site} conceptMedia={getMatchedConceptSet(site.template, site.category, site.services, site.businessName)} />
  </>;
}
`);
  await writeFile(join(preview, 'postcss.config.mjs'), 'export default {plugins:{"@tailwindcss/postcss":{}}};\n');
  await writeFile(join(preview, 'next.config.ts'), "import type {NextConfig} from 'next';\nconst config: NextConfig = {};\nexport default config;\n");
  await writeFile(join(preview, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true,
      strict: true, noEmit: true, allowImportingTsExtensions: true, esModuleInterop: true, module: 'esnext',
      moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'react-jsx', incremental: true,
      paths: {'@/*': ['./*']},
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  }, null, 2));
  await writeFile(join(preview, 'package.json'), JSON.stringify({
    name: 'example-data-barbers-preview', private: true,
    scripts: {build: 'next build', start: 'next start'},
    dependencies: {next: '16.4.0', react: '19.3.0', 'react-dom': '19.3.0', 'lucide-react': '0.500.0'},
    devDependencies: {
      typescript: '5.9.3', '@types/node': '24.19.1', '@types/react': '19.3.0', '@types/react-dom': '19.3.0',
      tailwindcss: '4.3.3', '@tailwindcss/postcss': '4.3.3', postcss: '8.5.29',
    },
  }, null, 2));
  console.log('Installing the preview runtime from the local npm cache...');
  await run('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], preview);

  const productionDir = join(outRoot, 'example-data-barbers');
  const loopDir = join(outRoot, 'example-data-barbers-loop');
  await rm(productionDir, {recursive: true, force: true});
  await rm(loopDir, {recursive: true, force: true});
  await mkdir(join(productionDir, 'screenshots'), {recursive: true});
  await mkdir(join(loopDir, 'screenshots'), {recursive: true});
  await writeFile(join(productionDir, 'blueprint.json'), JSON.stringify({
    label: 'example data',
    factStatus: built.site.content.factStatus,
    publishReady: built.site.quality.publishReady,
    template: built.site.template,
    category: built.site.category,
    composition: built.site.design.composition,
    typography: built.site.design.typography,
    motion: built.site.design.motion,
    sectionOrder: built.site.design.sectionOrder,
    conceptMedia: built.conceptMedia,
    headline: built.site.headline,
    description: built.site.description,
    narrative: built.site.narrative,
    primaryAction: built.site.primaryAction,
    internalDisclaimer: built.site.internalDisclaimer,
    evaluation: built.site.quality.evaluation,
    sector: built.resolved.decision,
  }, null, 2) + '\n');
  await writeFile(join(loopDir, 'generator-loop-raw.html'), loop.html);
  await writeFile(join(loopDir, 'candidate.json'), JSON.stringify({
    label: 'example data',
    candidate: loop.candidate,
    sectionKinds: loop.plan.sections.map((section) => section.kind),
    typography: loop.plan.typography,
    note: 'renderPlanHtml output before the audit harness banner. Fonts are named and not loaded.',
  }, null, 2) + '\n');

  console.log('Building the example preview (production renderer, not the export gate)...');
  try {
    await run('npx', ['next', 'build'], preview);
  } catch (error) {
    const builtPage = join(preview, '.next', 'server', 'app', 'index.html');
    try {
      await readFile(builtPage);
      console.warn('next build wrote the page and then exited. Continuing with that output.');
    } catch {
      throw error;
    }
  }
  const port = 4327;
  const server = spawn(join(preview, 'node_modules', '.bin', 'next'), ['start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: preview,
    stdio: 'inherit',
    detached: true,
    env: {...process.env, NEXT_TELEMETRY_DISABLED: '1'},
  });
  try {
    await waitFor(`http://127.0.0.1:${port}/`, server);
    const {chromium} = await import('@playwright/test');
    const browser = await chromium.launch({
      executablePath: process.env.QA_CHROMIUM_PATH || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-gpu', '--no-zygote'],
    });
    try {
      await capture(browser, `http://127.0.0.1:${port}/`, productionDir, true);
      const wrapped = wrapLoop(loop.html);
      await writeFile(join(loopDir, 'index.html'), wrapped);
      await capture(browser, null, loopDir, false);
    } finally {
      await browser.close();
    }
  } finally {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
    try {
      const listing = execSync('ps -eo pid,cmd', {encoding: 'utf8'});
      for (const line of listing.split('\n')) {
        if (!line.includes(String(port)) || !line.includes('next')) continue;
        const pid = Number(line.trim().split(/\s+/)[0]);
        if (pid) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            // Already gone.
          }
        }
      }
    } catch {
      // ps failed; the process-group signal above is the primary stop.
    }
  }
  return {productionDir, loopDir, preview};
}

function wrapLoop(html) {
  const banner = `<div role="note" data-audit-harness="banner" style="margin:0;padding:12px 16px;background:#241e1a;color:#f6f1e8;text-align:center;font:600 14px/1.4 system-ui,sans-serif">${BANNER}</div>`;
  let out = html.replace(/<head([^>]*)>/i, `<head$1><meta name="robots" content="noindex, nofollow">`);
  out = out.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  return out;
}

async function capture(browser, url, dir, inlineSnapshot) {
  const shots = [
    {name: 'desktop-1440.png', width: 1440, height: 900, full: false},
    {name: 'desktop-1440-full.png', width: 1440, height: 900, full: true},
    {name: 'mobile-390.png', width: 390, height: 844, full: false},
    {name: 'mobile-390-full.png', width: 390, height: 844, full: true},
  ];
  for (const shot of shots) {
    const context = await browser.newContext({
      viewport: {width: shot.width, height: shot.height},
      isMobile: shot.width < 500,
      hasTouch: shot.width < 500,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    if (url) await page.goto(url, {waitUntil: 'networkidle'});
    else {
      const html = await readFile(join(dir, 'index.html'), 'utf8');
      await page.setContent(html, {waitUntil: 'networkidle'});
    }
    await page.screenshot({path: join(dir, 'screenshots', shot.name), fullPage: shot.full});
    if (inlineSnapshot && shot.name === 'desktop-1440-full.png') {
      const snapshot = await page.evaluate(() => {
        const css = [];
        for (const sheet of document.styleSheets) {
          try {
            css.push([...sheet.cssRules].map((rule) => rule.cssText).join('\n'));
          } catch {
            // Cross-origin sheets are skipped. The preview serves its own CSS.
          }
        }
        const root = document.documentElement.cloneNode(true);
        root.querySelectorAll('script').forEach((node) => node.remove());
        root.querySelectorAll('link[rel="stylesheet"]').forEach((node) => node.remove());
        const style = document.createElement('style');
        style.textContent = css.join('\n');
        root.querySelector('head').appendChild(style);
        return '<!DOCTYPE html>\n' + root.outerHTML;
      });
      await writeFile(join(dir, 'index.html'), snapshot);
      const transfers = {htmlBytes: 0, cssBytes: 0, jsBytes: 0, fontBytes: 0, imageBytes: 0, remoteFontStylesheets: 0, viewport: true, source: 'playwright-document'};
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        type: entry.initiatorType,
        size: entry.transferSize || entry.encodedBodySize || 0,
      })));
      const doc = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return nav ? nav.transferSize || nav.encodedBodySize || 0 : 0;
      });
      transfers.htmlBytes = doc;
      for (const resource of resources) {
        const name = resource.name.toLowerCase();
        if (/fonts\.googleapis|fonts\.gstatic|typekit/.test(name)) transfers.remoteFontStylesheets += 1;
        if (resource.type === 'script' || name.includes('/_next/static/chunks/')) transfers.jsBytes += resource.size;
        else if (resource.type === 'css' || name.endsWith('.css')) transfers.cssBytes += resource.size;
        else if (resource.type === 'img' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(name)) transfers.imageBytes += resource.size;
        else if (name.endsWith('.woff2') || name.endsWith('.woff') || resource.type === 'font') transfers.fontBytes += resource.size;
      }
      await writeFile(join(dir, 'network-manifest.json'), JSON.stringify(transfers, null, 2) + '\n');
    }
    await context.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderExample().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  });
}

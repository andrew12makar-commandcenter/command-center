#!/usr/bin/env node
// BEFORE snapshot: the committed SiteRenderer, before design-system wiring.
// Confirmed Brighton Barbers facts used here: the name only. The street
// "8 Chestnut Hill Ave" is confirmed but this renderer has no address field.
// No phone, price, service, hour, or review is passed. owner_approved is not set.
import {execSync, spawn} from 'node:child_process';
import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDraft, defaultPreferences} from '../../lib/demo-engine.ts';
import {buildSiteBlueprint} from '../../lib/site-blueprint.ts';
import {resolveDemoTemplate} from '../../lib/business-classification.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'qa', 'generator', 'output', 'brighton-barbers-before');
const BANNER = 'Internal concept, not endorsed by the business';

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
const copiedDirs = ['lib/skill-packs'];

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
      // still starting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Preview server did not start.');
}

const resolved = resolveDemoTemplate('Brighton Barbers', 'barber', 'auto');
const draft = createDraft('Brighton Barbers', null, 'barber', resolved.template, defaultPreferences());
draft.services = [];
draft.siteContent = {
  ...draft.siteContent,
  about: '',
  appointmentUrl: null,
  sourceUrl: null,
  factStatus: 'unreviewed',
  heroTreatment: 'typographic',
  images: [],
  generatedImageryEnabled: false,
};
const site = buildSiteBlueprint(resolved.template, draft, {
  name: 'Brighton Barbers',
  city: null,
  phone: null,
  email: null,
  category: 'barber',
});
if (site.content.factStatus === 'owner_approved' || site.quality.publishReady) {
  throw new Error('Brighton preview must stay unapproved.');
}

const preview = join(tmpdir(), `l11-brighton-before-${process.pid}`);
await rm(preview, {recursive: true, force: true});
await mkdir(preview, {recursive: true});
for (const [dest, source] of Object.entries(copied)) {
  await mkdir(dirname(join(preview, dest)), {recursive: true});
  await cp(join(root, source), join(preview, dest));
}
for (const dir of copiedDirs) {
  await cp(join(root, dir), join(preview, dir), {recursive: true});
}
for (const path of ['components/site-renderer.tsx', 'components/site-industry-sections.tsx']) {
  await writeFile(join(preview, path), execSync(`git show HEAD:${path}`, {cwd: root}));
}
console.log('Copied the committed pre-wiring renderer into', preview);
await writeFile(join(preview, 'site-blueprint.json'), JSON.stringify(site, null, 2) + '\n');
await mkdir(join(preview, 'app'), {recursive: true});
await writeFile(join(preview, 'app', 'globals.css'), '@import "tailwindcss";\n@import "../styles/site-motion.css";\n');
await writeFile(join(preview, 'app', 'layout.tsx'), `import type {Metadata} from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Brighton Barbers — Internal concept',
  description: '${BANNER}',
  robots: {index: false, follow: false},
};
export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body className="m-0 min-h-screen antialiased">{children}</body></html>;
}
`);
await writeFile(join(preview, 'app', 'page.tsx'), `import SiteRenderer from '@/components/site-renderer';
import data from '@/site-blueprint.json';
import type {SiteBlueprint} from '@/lib/site-blueprint';
export default function Home() {
  const site = data as unknown as SiteBlueprint;
  return <>
    <p role="note" style={{margin:0,padding:'12px 16px',background:'#241e1a',color:'#f6f1e8',textAlign:'center',font:'600 14px/1.4 system-ui,sans-serif'}}>${BANNER}</p>
    <SiteRenderer standalone site={site} />
  </>;
}
`);
await writeFile(join(preview, 'postcss.config.mjs'), 'export default {plugins:{"@tailwindcss/postcss":{}}};\n');
await writeFile(join(preview, 'next.config.ts'), "import type {NextConfig} from 'next';\nconst config: NextConfig = {};\nexport default config;\n");
await writeFile(join(preview, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true,
    strict: true, noEmit: true, allowImportingTsExtensions: true, esModuleInterop: true, module: 'esnext',
    moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'react-jsx',
    paths: {'@/*': ['./*']},
  },
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['node_modules'],
}, null, 2));
await writeFile(join(preview, 'package.json'), JSON.stringify({
  name: 'brighton-barbers-before', private: true,
  scripts: {build: 'next build', start: 'next start'},
  dependencies: {next: '16.4.0', react: '19.3.0', 'react-dom': '19.3.0', 'lucide-react': '0.500.0'},
  devDependencies: {
    typescript: '5.9.3', '@types/node': '24.19.1', '@types/react': '19.3.0', '@types/react-dom': '19.3.0',
    tailwindcss: '4.3.3', '@tailwindcss/postcss': '4.3.3', postcss: '8.5.29',
  },
}, null, 2));
console.log('Installing the before-preview runtime from the local npm cache...');
await run('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], preview);
await mkdir(outDir, {recursive: true});
await mkdir(join(outDir, 'screenshots'), {recursive: true});
await writeFile(join(outDir, 'blueprint.json'), JSON.stringify({
  label: 'Brighton Barbers internal preview, renderer before design-system wiring',
  factStatus: site.content.factStatus,
  publishReady: site.quality.publishReady,
  ownerApproved: false,
  template: site.template,
  composition: site.design.composition,
  headline: site.headline,
  primaryAction: site.primaryAction,
  services: site.services,
  source: 'Name only. 8 Chestnut Hill Ave is confirmed but this renderer has no address field. No phone, service, price, hour, or review was supplied.',
}, null, 2) + '\n');

console.log('Building the before preview...');
try {
  await run('npx', ['next', 'build'], preview);
} catch (error) {
  console.warn(error instanceof Error ? error.message : error);
  console.warn('Retrying next build once after the advisory stop.');
  await run('npx', ['next', 'build'], preview);
}
const port = 4329;
const server = spawn(join(preview, 'node_modules', '.bin', 'next'), ['start', '-p', String(port), '-H', '127.0.0.1'], {
  cwd: preview, stdio: 'inherit', detached: true, env: {...process.env, NEXT_TELEMETRY_DISABLED: '1'},
});
try {
  await waitFor(`http://127.0.0.1:${port}/`, server);
  const {chromium} = await import('@playwright/test');
  const browser = await chromium.launch({
    executablePath: process.env.QA_CHROMIUM_PATH || '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu', '--no-zygote'],
  });
  try {
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
      await page.goto(`http://127.0.0.1:${port}/`, {waitUntil: 'networkidle'});
      await page.screenshot({path: join(outDir, 'screenshots', shot.name), fullPage: shot.full});
      await context.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill('SIGTERM'); }
}
console.log('Before screenshots written to', outDir);

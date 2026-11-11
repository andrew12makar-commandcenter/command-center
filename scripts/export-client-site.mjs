#!/usr/bin/env node
// Export an OWNER-APPROVED private blueprint into an isolated Next.js project.
// This DOES NOT publish or deploy anything and copies no image files.
import {readFile,writeFile,copyFile,mkdir,access,cp} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files={
 'components/site-renderer.tsx':'components/site-renderer.tsx',
 'components/site-industry-sections.tsx':'components/site-industry-sections.tsx',
 'lib/site-blueprint.ts':'lib/site-blueprint.ts',
 'lib/business-classification.ts':'lib/business-classification.ts',
 'lib/business-specific-copy.ts':'lib/business-specific-copy.ts',
 'lib/site-section-order.ts':'lib/site-section-order.ts',
 'lib/site-presentation.ts':'lib/site-presentation.ts',
 'lib/site-media-selection.ts':'lib/site-media-selection.ts',
 'lib/reviewed-business-features.ts':'lib/reviewed-business-features.ts',
 'lib/site-evaluation.ts':'lib/site-evaluation.ts',
 'lib/demo-engine.ts':'lib/demo-engine.ts',
 'lib/concept-imagery.ts':'lib/concept-imagery.ts',
 'lib/research-intelligence.ts':'lib/research-intelligence.ts',
 'lib/web-presence.ts':'lib/web-presence.ts',
 'styles/site-motion.css':'styles/site-motion.css'
};
const conceptAssets=[
 'medical-calm-interior-v1.jpg','medical-reception-editorial-v1.jpg','medical-treatment-detail-v1.jpg',
 'landscaping-crafted-outdoor-v1.jpg','landscaping-stone-path-v1.jpg','landscaping-garden-threshold-v1.jpg',
 'universal-consultation-studio-v1.jpg','universal-material-studio-v1.jpg','universal-collaboration-v1.jpg'
];
const html=(s)=>String(s||'').replace(/<[^>]*>/g,'').slice(0,160);
const isPublicLink=(value)=>{
 if(typeof value!=='string')return false;
 try{
  const u=new URL(value);
  return (u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password&&
   !u.port&&u.hostname.includes('.')&&!/(^|\\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)&&
   !/^(?:\\d{1,3}\\.){3}\\d{1,3}$/.test(u.hostname)&&!u.hostname.includes(':');
 }catch{return false;}
};
export function validateExport(raw){
 if(!raw||typeof raw!=='object'||raw.exportType!=='command-center-private-site-blueprint/v1')
  throw Error('Choose a private site-blueprint JSON export from Demo Studio.');
 const bp=raw.blueprint;
 if(!bp||typeof bp!=='object'||bp.version!==1||
   !['medical','landscaping','universal'].includes(bp.template))
  throw Error('Unsupported site blueprint version.');
 const c=bp.content||{};
 if(c.factStatus!=='owner_approved'||!bp.quality?.publishReady)
  throw Error('Only owner-approved content passing the basic publication gate can be exported.');
 if(bp.quality.evaluation?.accepted!==true)
  throw Error('The generator quality preflight must pass before export.');
 if(typeof bp.businessName!=='string'||!bp.businessName.trim()||
   !Array.isArray(bp.services)||bp.services.length===0||
   typeof c.about!=='string'||!c.about.trim()||!c.sourceUrl)
  throw Error('Approved business details, services and source are required.');
 if(!bp.contact?.phone&&!bp.contact?.email&&!c.appointmentUrl)
  throw Error('A verified contact or appointment destination is required.');
 if(!isPublicLink(c.sourceUrl)||(c.appointmentUrl&&!isPublicLink(c.appointmentUrl)))
  throw Error('Client project needs public web URLs for sources and booking.');

 const images=Array.isArray(c.images)?c.images:[];
 if(images.some(x=>x.permission!=='approved'))
  throw Error('Remove research-only image references before exporting a client project.');
 if(images.some(x=>!isPublicLink(x.url)||!isPublicLink(x.sourceUrl)))
  throw Error('Approved images must have public image and source URLs.');

 if(c.heroTreatment==='photo-led'&&!images.some(x=>x.permission==='approved'&&x.role==='hero'))
  throw Error('Photo-led sites require an explicitly approved hero image.');
 const safe={
  ...bp,
  content:{...c,images,researchPages:[],researchInsights:[],researchedAt:null},
  // Internal commercial briefs and source research must not ship to clients.
  internalDisclaimer:'',
  quality:{previewReady:true,publishReady:true,blockers:[],evaluation:bp.quality.evaluation}
 };
 return safe;
}
const asJson=(v)=>JSON.stringify(v,null,2)+'\n';
export async function exportProject(raw,output){
 const bp=validateExport(raw);
 return writeProject(bp,output,async target=>{
  await writeFile(join(target,'site-blueprint.json'),asJson(bp));
  await writeFile(join(target,'app','page.tsx'),`import SiteRenderer from '@/components/site-renderer';
import data from '@/site-blueprint.json';
import type {SiteBlueprint} from '@/lib/site-blueprint';
import {getMatchedConceptSet} from '@/lib/concept-imagery';
export default function Home(){const site=data as unknown as SiteBlueprint;return <SiteRenderer site={site} standalone conceptMedia={getMatchedConceptSet(site.template,site.category,site.services,site.businessName)}/>;}
`);
 });
}

// Browser QA renders several approved fixtures through the exact customer
// renderer and scaffold in ONE project. Every site passes the same export gate.
export async function exportReviewHarness(raws,output){
 if(!Array.isArray(raws)||raws.length===0)throw Error('At least one blueprint is required.');
 const sites={};
 for(const item of raws){
  if(!item||typeof item.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(item.id))throw Error('Each QA site needs a simple id.');
  if(sites[item.id])throw Error('Duplicate QA site id: '+item.id);
  sites[item.id]=validateExport(item.raw);
 }
 const first=Object.values(sites)[0];
 return writeProject(first,output,async target=>{
  await writeFile(join(target,'site-blueprint.json'),asJson(first));
  await writeFile(join(target,'qa-sites.json'),asJson(sites));
  await mkdir(join(target,'app','[site]'),{recursive:true});
  await writeFile(join(target,'app','[site]','page.tsx'),`import SiteRenderer from '@/components/site-renderer';
import sites from '@/qa-sites.json';
import type {SiteBlueprint} from '@/lib/site-blueprint';
import {getMatchedConceptSet} from '@/lib/concept-imagery';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
const all=sites as unknown as Record<string,SiteBlueprint>;
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(all).map(site=>({site}));}
export async function generateMetadata({params}:{params:Promise<{site:string}>}):Promise<Metadata>{const site=all[(await params).site];return site?{title:site.businessName,description:site.description||site.businessName}:{};}
export default async function Page({params}:{params:Promise<{site:string}>}){const site=all[(await params).site];if(!site)notFound();return <SiteRenderer site={site} standalone conceptMedia={getMatchedConceptSet(site.template,site.category,site.services,site.businessName)}/>;}
`);
  await writeFile(join(target,'app','page.tsx'),`import sites from '@/qa-sites.json';
export default function Index(){return <main style={{padding:32,fontFamily:'system-ui'}}><h1>Browser QA harness</h1><ul>{Object.entries(sites as Record<string,{businessName:string}>).map(([id,s])=><li key={id}><a href={'/'+id}>{s.businessName}</a></li>)}</ul></main>;}
`);
 });
}

async function writeProject(bp,output,writePages){
 const target=resolve(output);
 // Never overwrite an existing project, even if it looks empty.
 try{await access(target);throw Error('The destination already exists; choose a new empty path.');}
 catch(e){if(e?.code!=='ENOENT')throw e;}
 await mkdir(target,{recursive:true});
 try{
  for(const [dest,source] of Object.entries(files)){
   await mkdir(dirname(join(target,dest)),{recursive:true});
   await copyFile(join(root,source),join(target,dest));
  }
  await cp(join(root,'components','site-design-document.ts'),join(target,'components','site-design-document.ts'));
  await cp(join(root,'lib','design-system'),join(target,'lib','design-system'),{recursive:true});
  await mkdir(join(target,'public','fonts'),{recursive:true});
  await cp(join(root,'public','fonts','fraunces-9e509503.woff2'),join(target,'public','fonts','fraunces-9e509503.woff2'));
  await cp(join(root,'public','fonts','sourcesans3-e6c9ca63.woff2'),join(target,'public','fonts','sourcesans3-e6c9ca63.woff2'));
  await mkdir(join(target,'public','concepts'),{recursive:true});
  for(const asset of conceptAssets)await copyFile(join(root,'public','concepts',asset),join(target,'public','concepts',asset));
  await mkdir(join(target,'app'),{recursive:true});
  await writePages(target);
  await writeFile(join(target,'app','layout.tsx'),`import type {Metadata} from 'next';
import content from '@/site-blueprint.json';
import './globals.css';
export const metadata:Metadata={
 title:content.businessName,
 description:content.description||content.businessName,
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body className="m-0 min-h-screen antialiased">{children}</body></html>;
}
`);
  await writeFile(join(target,'app','icon.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#25384b"/><circle cx="32" cy="32" r="13" fill="none" stroke="#d4e0e7" stroke-width="5"/><path d="M32 10v8M54 32h-8M32 54v-8M10 32h8" stroke="#d4e0e7" stroke-width="4" stroke-linecap="round"/></svg>\n`);
  await writeFile(join(target,'app','globals.css'),'@import "tailwindcss";\n@import "../styles/site-motion.css";\n');
  await writeFile(join(target,'package.json'),asJson({
   name:'client-site-blueprint',version:'0.1.0',private:true,
   scripts:{dev:'next dev',build:'next build',start:'next start',typecheck:'tsc --noEmit'},
   dependencies:{next:'^16.1.0',react:'^19.2.0','react-dom':'^19.2.0','lucide-react':'^0.500.0'},
   devDependencies:{typescript:'^5.9.0','@types/node':'^24.0.0','@types/react':'^19.0.0','@types/react-dom':'^19.0.0',tailwindcss:'^4.0.0','@tailwindcss/postcss':'^4.0.0',postcss:'^8.0.0'}
  }));
  await writeFile(join(target,'postcss.config.mjs'),`export default {plugins:{'@tailwindcss/postcss':{}}};\n`);
  await writeFile(join(target,'tsconfig.json'),asJson({
   compilerOptions:{target:'ES2017',lib:['dom','dom.iterable','esnext'],allowJs:true,
    skipLibCheck:true,strict:true,noEmit:true,allowImportingTsExtensions:true,esModuleInterop:true,module:'esnext',
    moduleResolution:'bundler',resolveJsonModule:true,isolatedModules:true,
    jsx:'react-jsx',incremental:true,paths:{'@/*':['./*']}},
   include:['next-env.d.ts','**/*.ts','**/*.tsx','.next/types/**/*.ts'],
   exclude:['node_modules']
  }));
  await writeFile(join(target,'next.config.ts'),`import type {NextConfig} from 'next';
const config:NextConfig={};
export default config;
`);
  await writeFile(join(target,'.gitignore'),'node_modules\n.next\n.env*\n*.log\n');
  await writeFile(join(target,'README.md'),`# ${html(bp.businessName)}
Standalone Next.js site scaffold exported from Command Center Site Blueprint v1.

## Run locally
1. npm install
2. npm run dev
3. Visit http://localhost:3000
4. npm run typecheck && npm run build

## Before any live launch
The content pack records owner approval, but that is not a substitute for a written client sign-off.
- Review all services, provider claims and final copy on the rendered pages.
- Replace the neutral concept favicon with the client's approved brand mark before launch.
- Confirm all photos and logos are licensed for reuse. Prefer copied/optimized assets hosted under the client's control, not third-party hotlinks.
- Test navigation, phone/email, external appointment booking, accessibility, mobile appearance and SEO metadata.
- Configure actual contact/booking forms separately; the scaffold intentionally has NO form that collects user data.
- Test production Lighthouse performance. No speed improvements are guaranteed by the generator.
- Set up deployment, domain, privacy requirements, monitoring, backups and rollback with the client.

This scaffold has NO CRM or Supabase connection, secrets or internal admin routes.
`);
 }catch(error){
  // Output folder is intentionally left intact for human inspection.
  throw error;
 }
 return target;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,destination]=process.argv.slice(2);
 if(!input||!destination){
  console.error('Usage: node scripts/export-client-site.mjs ~/Downloads/site-blueprint-ID.json ../client-site-folder');
  process.exitCode=2;
 }else try{
  const raw=JSON.parse(await readFile(resolve(input),'utf8'));
  const path=await exportProject(raw,destination);
  console.log('Standalone CLIENT SITE SCAFFOLD created: '+path);
  console.log('Review the generated README. No website was published.');
 }catch(e){console.error('Export blocked: '+(e instanceof Error?e.message:String(e)));process.exitCode=1;}
}

#!/usr/bin/env node
// Export an OWNER-APPROVED private blueprint into an isolated Next.js project.
// This DOES NOT publish or deploy anything and copies no image files.
import {readFile,writeFile,copyFile,mkdir,access} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files={
 'components/site-renderer.tsx':'components/site-renderer.tsx',
 'lib/site-blueprint.ts':'lib/site-blueprint.ts',
 'lib/demo-engine.ts':'lib/demo-engine.ts',
 'lib/web-presence.ts':'lib/web-presence.ts'
};
const html=(s)=>String(s||'').replace(/<[^>]*>/g,'').slice(0,160);
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
 if(typeof bp.businessName!=='string'||!bp.businessName.trim()||
   !Array.isArray(bp.services)||bp.services.length===0||
   typeof c.about!=='string'||!c.about.trim()||!c.sourceUrl)
  throw Error('Approved business details, services and source are required.');
 if(!bp.contact?.phone&&!bp.contact?.email&&!c.appointmentUrl)
  throw Error('A verified contact or appointment destination is required.');
 const images=Array.isArray(c.images)?c.images:[];
 if(images.some(x=>x.permission!=='approved'))
  throw Error('Remove research-only image references before exporting a client project.');
 if(c.heroTreatment==='photo-led'&&!images.some(x=>x.permission==='approved'&&x.role==='hero'))
  throw Error('Photo-led sites require an explicitly approved hero image.');
 const safe={
  ...bp,
  content:{...c,images, researchPages:[],researchedAt:null},
  // Internal commercial briefs and source research must not ship to clients.
  internalDisclaimer:'',
  quality:{previewReady:true,publishReady:true,blockers:[]}
 };
 return safe;
}
const asJson=(v)=>JSON.stringify(v,null,2)+'\n';
export async function exportProject(raw,output){
 const bp=validateExport(raw);
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
  await mkdir(join(target,'app'),{recursive:true});
  await writeFile(join(target,'site-blueprint.json'),asJson(bp));
  await writeFile(join(target,'app','page.tsx'),`import SiteRenderer from '@/components/site-renderer';
import data from '@/site-blueprint.json';
import type {SiteBlueprint} from '@/lib/site-blueprint';
export default function Home(){return <SiteRenderer site={data as SiteBlueprint} standalone/>;}
`);
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
  await writeFile(join(target,'app','globals.css'),'@import "tailwindcss";\n');
  await writeFile(join(target,'package.json'),asJson({
   name:'client-site-blueprint',version:'0.1.0',private:true,
   scripts:{dev:'next dev',build:'next build',start:'next start',typecheck:'tsc --noEmit'},
   dependencies:{next:'^16.1.0',react:'^19.2.0','react-dom':'^19.2.0','lucide-react':'^0.500.0'},
   devDependencies:{typescript:'^5.9.0','@types/node':'^24.0.0','@types/react':'^19.0.0','@types/react-dom':'^19.0.0',tailwindcss:'^4.0.0','@tailwindcss/postcss':'^4.0.0',postcss:'^8.0.0'}
  }));
  await writeFile(join(target,'postcss.config.mjs'),`export default {plugins:{'@tailwindcss/postcss':{}}};\n`);
  await writeFile(join(target,'tsconfig.json'),asJson({
   compilerOptions:{target:'ES2017',lib:['dom','dom.iterable','esnext'],allowJs:true,
    skipLibCheck:true,strict:true,noEmit:true,esModuleInterop:true,module:'esnext',
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

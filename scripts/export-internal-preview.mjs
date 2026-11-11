#!/usr/bin/env node
// Static internal-review export. Every page keeps the concept disclaimer
// visible and sends noindex. This path does not publish, and it does not
// consult or change owner approval. It is not the client-site exporter.
import {execFileSync} from 'node:child_process';
import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const DISCLAIMER='Internal concept, not endorsed by the business';
export const ROBOTS='noindex,nofollow,noarchive';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CSS=`.internal-preview-banner{display:block;visibility:visible;opacity:1;position:sticky;top:0;z-index:5;margin:0;padding:14px 20px;background:#f4c542;color:#1a1206;border-bottom:3px solid #1a1206;font:700 1rem/1.4 system-ui,sans-serif;text-align:center}
.internal-preview-footer{display:block;visibility:visible;opacity:1;margin:0;padding:20px;background:#1a1206;color:#f4c542;font:700 1rem/1.4 system-ui,sans-serif;text-align:center}
body{margin:0;background:#f6f5f1;color:#1b2938;font:16px/1.5 system-ui,sans-serif}
header,main{max-width:880px;margin:0 auto;padding:24px 20px}
header{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;padding-bottom:0}
.brand{margin:0;font-size:1.05rem;font-weight:700}
nav{display:flex;flex-wrap:wrap;gap:8px 14px}
nav a{color:#1b2938}
h1{font-size:clamp(1.8rem,3vw,2.6rem);line-height:1.1;margin:0 0 12px}
.example-flag,.confirm{background:#fff;border:1px solid #1a1206;padding:10px 12px}
.example-flag{font-weight:700}
ul{padding-left:1.2rem}
.preview-stamp{max-width:880px;margin:0 auto;padding:10px 20px 28px;color:#4a453c;font-size:.85rem}
a{color:#174a63}`;

const esc=(value)=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function readString(obj,key,max){
 if(!obj||typeof obj!=='object')return '';
 const value=obj[key];
 if(typeof value!=='string')return '';
 const trimmed=value.trim();
 return trimmed.length>max?trimmed.slice(0,max):trimmed;
}
function readStringList(value,maxItems,maxLen){
 if(!Array.isArray(value))return [];
 const out=[];
 for(const item of value){
  if(out.length>=maxItems)break;
  if(typeof item!=='string')continue;
  const trimmed=item.trim();
  if(!trimmed)continue;
  out.push(trimmed.length>maxLen?trimmed.slice(0,maxLen):trimmed);
 }
 return out;
}
function httpUrl(value){
 if(typeof value!=='string'||!value)return '';
 try{
  const url=new URL(value.trim());
  if((url.protocol!=='https:'&&url.protocol!=='http:')||url.username||url.password)return '';
  return url.toString();
 }catch{return '';}
}
function readPages(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,24).map(page=>{
  if(!page||typeof page!=='object')throw Error('Each preview page must be an object.');
  return {
   slug:readString(page,'slug',60),
   title:readString(page,'title',140),
   heading:readString(page,'heading',200),
   paragraphs:readStringList(page.paragraphs,12,800),
   items:readStringList(page.items,24,160),
   showContact:page.showContact===true
  };
 });
}

export function readGeneratedSite(raw){
 if(!raw||typeof raw!=='object')throw Error('A generated site object is required.');
 const bp=raw.blueprint&&typeof raw.blueprint==='object'?raw.blueprint:raw;
 const content=bp.content&&typeof bp.content==='object'?bp.content:null;
 const contact=bp.contact&&typeof bp.contact==='object'?bp.contact:null;
 const narrative=bp.narrative&&typeof bp.narrative==='object'?bp.narrative:null;
 const businessName=readString(bp,'businessName',140);
 if(!businessName)throw Error('A business name is required for an internal preview.');
 const pages=readPages(Array.isArray(bp.pages)?bp.pages:raw.pages);
 return {
  businessName,
  headline:readString(bp,'headline',200),
  description:readString(bp,'description',800),
  about:readString(content,'about',2000),
  audience:readString(content,'audience',300),
  sourceUrl:httpUrl(readString(content,'sourceUrl',400)),
  appointmentUrl:httpUrl(readString(content,'appointmentUrl',400)),
  phone:readString(contact,'phone',80),
  email:readString(contact,'email',140),
  city:readString(contact,'city',100),
  services:readStringList(bp.services,24,160),
  servicesHeading:readString(narrative,'servicesHeading',160),
  aboutHeading:readString(narrative,'aboutHeading',160),
  contactHeading:readString(narrative,'contactHeading',160),
  pages,
  example:raw.example===true||bp.example===true||/^example\b/i.test(businessName)
 };
}

function synthesizePages(site){
 const pages=[{
  slug:'index',title:'Home',heading:site.headline||site.businessName,
  paragraphs:[site.description,site.about].filter(Boolean),items:site.services,showContact:false
 }];
 if(site.services.length)pages.push({
  slug:'services',title:'Services',heading:site.servicesHeading||'Services',
  paragraphs:[],items:site.services,showContact:false
 });
 if(site.about)pages.push({
  slug:'about',title:'About',heading:site.aboutHeading||'About',
  paragraphs:[site.about,site.audience].filter(Boolean),items:[],showContact:false
 });
 if(site.phone||site.email||site.city)pages.push({
  slug:'contact',title:'Contact',heading:site.contactHeading||'Contact',
  paragraphs:['Recorded contact details. Unknown / to confirm.'],items:[],showContact:true
 });
 return pages;
}
function fileFor(slug){
 if(!SLUG.test(slug)||slug.length>60||slug==='manifest')throw Error('Refusing to export: page slug "'+slug+'" is not allowed.');
 const name=slug+'.html';
 if(basename(name)!==name)throw Error('Refusing to export: unsafe page path.');
 return name;
}
function pagesOf(site){
 const pages=site.pages.length?site.pages:synthesizePages(site);
 if(!pages.length)throw Error('Refusing to export: the preview has no pages.');
 const seen=new Set();
 for(const page of pages){
  fileFor(page.slug||'');
  if(seen.has(page.slug))throw Error('Refusing to export: duplicate page "'+page.slug+'".');
  seen.add(page.slug);
 }
 return pages;
}

function cssHides(html,className){
 const rule=/([^{}]+)\{([^{}]*)\}/g;
 let match;
 while((match=rule.exec(html))){
  if(!match[1].includes(className))continue;
  if(/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\b|font-size\s*:\s*0\b/i.test(match[2]))return true;
 }
 return false;
}
function markedText(html,className){
 const at=html.indexOf('class="'+className+'"');
 if(at<0)return null;
 const openStart=html.lastIndexOf('<',at);
 const openEnd=html.indexOf('>',at);
 if(openStart<0||openEnd<0)return null;
 const open=html.slice(openStart,openEnd+1);
 const tag=/^<([a-z0-9]+)\b/i.exec(open);
 if(!tag)return null;
 if(/\shidden[\s>]|aria-hidden\s*=\s*["']true["']/i.test(open))return null;
 if(/style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0\b|font-size\s*:\s*0\b|left\s*:\s*-\d{3,})/i.test(open))return null;
 const closeAt=html.indexOf('</'+tag[1]+'>',openEnd+1);
 if(closeAt<0)return null;
 return html.slice(openEnd+1,closeAt).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
}
export function assertPreviewPage(html,label='page'){
 if(DISCLAIMER!=='Internal concept, not endorsed by the business')
  throw Error('Refusing to export: disclaimer would be missing on '+label+'.');
 if(typeof html!=='string')throw Error('Refusing to export: disclaimer would be missing on '+label+'.');
 const visible=html.replace(/<!--[\s\S]*?-->/g,'');
 const banner=markedText(visible,'internal-preview-banner');
 const footer=markedText(visible,'internal-preview-footer');
 if(banner!==DISCLAIMER||footer!==DISCLAIMER)
  throw Error('Refusing to export: disclaimer would be missing on '+label+'.');
 if(cssHides(visible,'internal-preview-banner')||cssHides(visible,'internal-preview-footer'))
  throw Error('Refusing to export: disclaimer would be hidden on '+label+'.');
 if(!visible.includes('<meta name="robots" content="'+ROBOTS+'">'))
  throw Error('Refusing to export: noindex would be missing on '+label+'.');
}

function contactBlock(site){
 const rows=[];
 if(site.phone)rows.push('<li>Recorded phone (unknown / to confirm): '+esc(site.phone)+'</li>');
 if(site.email)rows.push('<li>Recorded email (unknown / to confirm): '+esc(site.email)+'</li>');
 if(site.city)rows.push('<li>Recorded city (unknown / to confirm): '+esc(site.city)+'</li>');
 if(site.appointmentUrl)rows.push('<li>Recorded appointment link (unknown / to confirm): <a href="'+esc(site.appointmentUrl)+'">'+esc(site.appointmentUrl)+'</a></li>');
 if(site.sourceUrl)rows.push('<li>Recorded source (unknown / to confirm): <a href="'+esc(site.sourceUrl)+'">'+esc(site.sourceUrl)+'</a></li>');
 if(!rows.length)return '';
 return '<ul>'+rows.join('')+'</ul>';
}
export function renderPage(page,site,provenance={sourceCommit:'unknown / to confirm',timestamp:'unknown / to confirm'}){
 const pages=pagesOf(site);
 const nav=pages.map(item=>{
  const name=fileFor(item.slug);
  const label=item.title||item.slug;
  return '<a href="'+esc(name)+'">'+esc(label)+'</a>';
 }).join('');
 const paragraphs=(page.paragraphs||[]).map(text=>'<p>'+esc(text)+'</p>').join('');
 const items=(page.items||[]).length?'<ul>'+page.items.map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>':'';
 const main=[
  site.example?'<p class="example-flag">Example data. Synthetic fixture, not a real business.</p>':'',
  '<h1>'+esc(page.heading||page.title||site.businessName)+'</h1>',
  paragraphs,
  items,
  page.showContact?contactBlock(site):'',
  '<p class="confirm">Internal review only. Unknown details stay unknown / to confirm.</p>'
 ].join('\n');
 return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'+
  '<meta name="robots" content="'+ROBOTS+'">\n<title>'+esc((page.title||'Preview')+' — '+site.businessName+' internal preview')+'</title>\n<style>\n'+CSS+'\n</style>\n</head>\n<body>\n'+
  '<p class="internal-preview-banner" role="note">'+DISCLAIMER+'</p>\n<header><p class="brand">'+esc(site.businessName)+'</p><nav aria-label="Preview pages">'+nav+'</nav></header>\n'+
  '<main>\n'+main+'\n</main>\n<footer class="internal-preview-footer">'+DISCLAIMER+'</footer>\n'+
  '<p class="preview-stamp">internal-preview · '+esc(provenance.sourceCommit)+' · '+esc(provenance.timestamp)+'</p>\n</body>\n</html>\n';
}

export function parseSiteJson(text){
 return JSON.parse(text,(key,value)=>key==='factStatus'?undefined:value);
}
export function readSourceCommit(cwd=ROOT){
 try{
  const sha=execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  if(/^[0-9a-f]{7,40}$/i.test(sha))return sha.toLowerCase();
 }catch{/* git output is not a commit we can claim */}
 return 'unknown / to confirm';
}
function normalizeCommit(value){
 if(value===undefined)return readSourceCommit();
 if(value==='unknown / to confirm')return value;
 if(typeof value==='string'&&/^[0-9a-f]{7,40}$/i.test(value))return value.toLowerCase();
 return 'unknown / to confirm';
}
function normalizeTimestamp(value){
 if(value===undefined)return new Date().toISOString();
 if(typeof value==='string'&&Number.isFinite(Date.parse(value)))return new Date(value).toISOString();
 throw Error('Refusing to export: timestamp is not a real time.');
}

export async function exportInternalPreview(raw,output,options={}){
 if(options&&Object.prototype.hasOwnProperty.call(options,'disclaimer')&&options.disclaimer!==DISCLAIMER)
  throw Error('Refusing to export: disclaimer would be missing.');
 const site=readGeneratedSite(raw);
 const pages=pagesOf(site);
 const provenance={sourceCommit:normalizeCommit(options.sourceCommit),timestamp:normalizeTimestamp(options.timestamp)};
 const render=typeof options.renderPage==='function'?options.renderPage:renderPage;
 const rendered=pages.map(page=>{
  const file=fileFor(page.slug);
  const html=render(page,site,provenance);
  assertPreviewPage(html,file);
  return {file,html};
 });
 const target=resolve(output);
 try{await access(target);throw Error('The destination already exists; choose a new empty path.');}
 catch(error){if(error?.code!=='ENOENT')throw error;}
 const manifest={
  kind:'internal-preview',
  sourceCommit:provenance.sourceCommit,
  timestamp:provenance.timestamp,
  businessName:site.businessName,
  exampleData:site.example,
  disclaimer:DISCLAIMER,
  robots:ROBOTS,
  pages:rendered.map(page=>page.file)
 };
 await mkdir(target,{recursive:true});
 for(const page of rendered){
  await writeFile(join(target,page.file),page.html);
  assertPreviewPage(await readFile(join(target,page.file),'utf8'),page.file);
 }
 await writeFile(join(target,'robots.txt'),'User-agent: *\nDisallow: /\n\n# internal-preview\n');
 await writeFile(join(target,'internal-preview-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 return {target,pages:manifest.pages,manifest};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length!==2){
  console.error('Usage: node scripts/export-internal-preview.mjs site.json ../internal-preview-folder');
  process.exitCode=2;
 }else try{
  const raw=parseSiteJson(await readFile(resolve(args[0]),'utf8'));
  const result=await exportInternalPreview(raw,args[1]);
  console.log('Internal preview created: '+result.target);
  console.log('Pages: '+result.pages.join(', '));
  console.log('No website was published. Review only.');
 }catch(error){
  console.error('Export refused: '+(error instanceof Error?error.message:String(error)));
  process.exitCode=1;
 }
}

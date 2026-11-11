// Captures desktop and 390px screenshots with the system Chrome DevTools protocol.
// Run from the repo root: node qa/design-system/capture-screenshots.mjs

import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const htmlUrl=pathToFileURL(path.resolve('qa/design-system/preview.html')).href;
const outDir=path.resolve('qa/design-system/screenshots');
mkdirSync(outDir,{recursive:true});
const profile=`/tmp/chrome-design-system-${process.pid}`;
const chrome=spawn('google-chrome',[
 '--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check',
 '--remote-debugging-port=9222',`--user-data-dir=${profile}`,'about:blank'
],{stdio:'ignore'});

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function browserReady(){
 for(let attempt=0;attempt<40;attempt++){
  try{
   const response=await fetch('http://127.0.0.1:9222/json/version');
   if(response.ok)return;
  }catch{/* chrome is still booting */}
  await sleep(150);
 }
 throw new Error('Chrome DevTools did not open');
}

class Page{
 constructor(ws){this.ws=ws;this.next=0;this.pending=new Map();
  ws.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(message.id&&this.pending.has(message.id)){
    const {resolve,reject}=this.pending.get(message.id);
    this.pending.delete(message.id);
    if(message.error)reject(new Error(message.error.message));
    else resolve(message.result);
   }
  });
 }
 send(method,params={}){
  const id=++this.next;
  this.ws.send(JSON.stringify({id,method,params}));
  return new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject}));
 }
}

await browserReady();
const created=await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'}).then(response=>response.json());
const socket=new WebSocket(created.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve);socket.addEventListener('error',reject);});
const page=new Page(socket);
await page.send('Page.enable');
await page.send('Runtime.enable');
await page.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await page.send('Page.navigate',{url:htmlUrl});
await page.send('Runtime.evaluate',{expression:'document.fonts.ready',awaitPromise:true});
await page.send('Runtime.evaluate',{expression:'new Promise(resolve=>setTimeout(resolve,1300))',awaitPromise:true});

async function metrics(){
 const expression=`(() => {
  const root=document.documentElement;
  const offenders=[...document.querySelectorAll('body *')].filter(el=>{
   const box=el.getBoundingClientRect();
   return box.width>0 && (box.right>root.clientWidth+1 || box.left<0);
  }).slice(0,8).map(el=>el.tagName+'.'+String(el.className).slice(0,80));
  return {
   scrollWidth:root.scrollWidth,
   clientWidth:root.clientWidth,
   scrollHeight:root.scrollHeight,
   overflow:root.scrollWidth-root.clientWidth,
   imagesWithoutAlt:[...document.querySelectorAll('img')].filter(img=>!img.getAttribute('alt')||!img.getAttribute('alt').trim()).length,
   externalRequests:[...document.querySelectorAll('script[src],link[href],img[src]')].map(el=>el.src||el.href).filter(url=>/^https?:/i.test(url)),
   fonts:[...document.fonts].map(font=>({family:font.family,status:font.status,weight:String(font.weight)})),
   hero:((el)=>{if(!el)return null; const style=getComputedStyle(el); return {color:style.color,opacity:style.opacity,weight:style.fontWeight,family:style.fontFamily,size:style.fontSize};})(document.querySelector('#example-barber .ds-display')),
   offenders
  };
 })()`;
 const result=await page.send('Runtime.evaluate',{expression,returnByValue:true});
 return result.result.value;
}

async function heroTop(){
 const result=await page.send('Runtime.evaluate',{expression:`document.querySelector('#example-barber .ds-hero').getBoundingClientRect().top + window.scrollY`,returnByValue:true});
 return result.result.value;
}
async function shoot(name,width,height,full){
 await page.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
 const info=await metrics();
 const clipHeight=full?info.scrollHeight:height;
 const clipY=full?0:await heroTop();
 const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:clipY,width,height:clipHeight,scale:1}});
 writeFileSync(path.join(outDir,name),Buffer.from(shot.data,'base64'));
 return {...info,capturedHeight:clipHeight,clipY,clipped:info.scrollHeight>clipHeight};
}

const desktop=await shoot('desktop-hero.png',1440,900,false);
const desktopFull=await shoot('desktop.png',1440,900,true);
const mobile=await shoot('mobile-390-hero.png',390,844,false);
const mobileFull=await shoot('mobile-390.png',390,844,true);
console.log(JSON.stringify({desktop,desktopFull:{...desktopFull,fonts:undefined},mobile,mobileFull:{...mobileFull,fonts:undefined}},null,2));
socket.close();
chrome.kill();
process.exit(0);

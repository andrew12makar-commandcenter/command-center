'use client';
import {useState} from 'react';

// Print and copy only. Nothing is sent, published or shared.
export default function PitchBriefActions({markdown}:{markdown:string}){
 const [copied,setCopied]=useState<'idle'|'done'|'failed'>('idle');
 return <div className="no-print flex flex-wrap gap-3">
  <button type="button" className="btn" onClick={()=>window.print()}>Print / save as PDF</button>
  <button type="button" className="btn" onClick={async()=>{
   try{await navigator.clipboard.writeText(markdown);setCopied('done');}catch{setCopied('failed');}
  }}>{copied==='done'?'Copied ✓':copied==='failed'?'Copy failed: use the text below':'Copy as Markdown'}</button>
 </div>;
}

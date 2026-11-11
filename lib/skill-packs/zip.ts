// Local zip reader for skill-pack import. Store and deflate only. No network.
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {SkillPackError} from './validate.ts';

const MAX_FILES=8;
const MAX_FILE_BYTES=256_000;
const MAX_TOTAL_BYTES=1_000_000;

export function readZip(buffer:Buffer):Map<string,Buffer>{
 if(buffer.length<22||buffer.length>MAX_TOTAL_BYTES)throw new SkillPackError('zip: archive is empty or too large');
 const eocd=findEocd(buffer);
 const count=buffer.readUInt16LE(eocd+10);
 const size=buffer.readUInt32LE(eocd+12);
 const offset=buffer.readUInt32LE(eocd+16);
 if(count>MAX_FILES)throw new SkillPackError('zip: too many entries');
 if(offset>buffer.length||size>buffer.length||offset+size>buffer.length)throw new SkillPackError('zip: bad central directory');
 const files=new Map<string,Buffer>();
 let cursor=offset,total=0;
 for(let index=0;index<count;index++){
  if(buffer.readUInt32LE(cursor)!==0x02014b50)throw new SkillPackError('zip: bad central directory entry');
  const flags=buffer.readUInt16LE(cursor+8);
  const method=buffer.readUInt16LE(cursor+10);
  const compressedSize=buffer.readUInt32LE(cursor+20);
  const uncompressedSize=buffer.readUInt32LE(cursor+24);
  const nameLength=buffer.readUInt16LE(cursor+28);
  const extraLength=buffer.readUInt16LE(cursor+30);
  const commentLength=buffer.readUInt16LE(cursor+32);
  const localOffset=buffer.readUInt32LE(cursor+42);
  const name=buffer.toString('utf8',cursor+46,cursor+46+nameLength);
  cursor+=46+nameLength+extraLength+commentLength;
  if(name.endsWith('/'))continue;
  if(flags&0x1)throw new SkillPackError('zip: encrypted entries are rejected');
  if(uncompressedSize>MAX_FILE_BYTES||compressedSize>MAX_FILE_BYTES)throw new SkillPackError(`zip: ${name} is too large`);
  const safeName=safeZipPath(name);
  if(buffer.readUInt32LE(localOffset)!==0x04034b50)throw new SkillPackError(`zip: missing local header for ${name}`);
  const localName=buffer.readUInt16LE(localOffset+26);
  const localExtra=buffer.readUInt16LE(localOffset+28);
  const dataStart=localOffset+30+localName+localExtra;
  if(dataStart+compressedSize>buffer.length)throw new SkillPackError(`zip: truncated ${name}`);
  const compressed=buffer.subarray(dataStart,dataStart+compressedSize);
  let data:Buffer;
  if(method===0)data=Buffer.from(compressed);
  else if(method===8)data=Buffer.from(inflateRawSync(compressed));
  else throw new SkillPackError(`zip: unsupported method ${method} for ${name}`);
  if(data.length!==uncompressedSize)throw new SkillPackError(`zip: size mismatch for ${name}`);
  if(data.length>compressedSize*50&&data.length>100_000)throw new SkillPackError(`zip: ${name} expands too far`);
  total+=data.length;
  if(total>MAX_TOTAL_BYTES)throw new SkillPackError('zip: uncompressed pack is too large');
  files.set(safeName,data);
 }
 if(!files.size)throw new SkillPackError('zip: no files found');
 return files;
}

function findEocd(buffer:Buffer){
 const start=Math.max(0,buffer.length-22-65535);
 for(let index=buffer.length-22;index>=start;index--){
  if(buffer.readUInt32LE(index)!==0x06054b50)continue;
  const comment=buffer.readUInt16LE(index+20);
  if(index+22+comment===buffer.length)return index;
 }
 throw new SkillPackError('zip: missing end of central directory');
}
export function safeZipPath(name:string){
 const normalized=name.replaceAll('\\','/');
 if(normalized.startsWith('/')||normalized.split('/').some(part=>part==='..'||part==='.'||part==='')||normalized.includes('\0'))
  throw new SkillPackError(`zip: unsafe path ${name}`);
 return normalized;
}

function crc32(buffer:Buffer){
 let crc=~0;
 for(const byte of buffer){
  crc^=byte;
  for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(crc&1?0xedb88320:0);
 }
 return (~crc)>>>0;
}
export function archiveZip(files:Record<string,Buffer>,method:0|8=0){
 const locals:Buffer[]=[];
 const central:Buffer[]=[];
 let offset=0;
 for(const [name,data] of Object.entries(files)){
  const safe=safeZipPath(name);
  const nameBuf=Buffer.from(safe);
  const payload=method===8?deflateRawSync(data):data;
  const crc=crc32(data);
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);
  local.writeUInt16LE(20,4);
  local.writeUInt16LE(method,8);
  local.writeUInt32LE(crc,14);
  local.writeUInt32LE(payload.length,18);
  local.writeUInt32LE(data.length,22);
  local.writeUInt16LE(nameBuf.length,26);
  const header=Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50,0);
  header.writeUInt16LE(20,4);
  header.writeUInt16LE(20,6);
  header.writeUInt16LE(method,10);
  header.writeUInt32LE(crc,16);
  header.writeUInt32LE(payload.length,20);
  header.writeUInt32LE(data.length,24);
  header.writeUInt16LE(nameBuf.length,28);
  header.writeUInt32LE(offset,42);
  locals.push(local,nameBuf,payload);
  central.push(header,nameBuf);
  offset+=local.length+nameBuf.length+payload.length;
 }
 const directory=Buffer.concat(central);
 const end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);
 const count=Object.keys(files).length;
 end.writeUInt16LE(count,8);
 end.writeUInt16LE(count,10);
 end.writeUInt32LE(directory.length,12);
 end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,directory,end]);
}

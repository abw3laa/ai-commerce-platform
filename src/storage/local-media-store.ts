/* eslint-disable @typescript-eslint/no-explicit-any */
import {createReadStream,createWriteStream} from "node:fs";
import {mkdir,unlink,stat} from "node:fs/promises";
import {join,resolve,basename} from "node:path";
import {pipeline} from "node:stream/promises";
import {Transform,Readable} from "node:stream";
import {randomUUID} from "node:crypto";
export interface MediaStore{save(input:{stream:NodeJS.ReadableStream|Buffer;extension:string;maxBytes:number}):Promise<{key:string;sizeBytes:number}>;open(key:string):NodeJS.ReadableStream;remove(key:string):Promise<void>;size(key:string):Promise<number>;}
function safeKey(key:string){const clean=basename(key);if(clean!==key||clean.includes(".."))throw new Error("invalid_storage_key");return clean;}
export function createLocalMediaStore(directory:string):MediaStore{const root=resolve(directory);const pathFor=(key:string)=>join(root,safeKey(key));return{
 async save({stream,extension,maxBytes}){await mkdir(root,{recursive:true});const key=`${randomUUID()}.${extension}`;const path=pathFor(key);let size=0;const limited=new Transform({transform(chunk,_,cb){size+=Buffer.byteLength(chunk);if(size>maxBytes){cb(new Error("media_too_large"));return;}cb(null,chunk);}});try{if(Buffer.isBuffer(stream)){if(stream.length>maxBytes)throw new Error("media_too_large");await pipeline(Readable.from(stream),limited,createWriteStream(path));}else{await pipeline(stream as any,limited,createWriteStream(path));}return{key,sizeBytes:size};}catch(e){await unlink(path).catch(()=>{});throw e;}},
 open(key){return createReadStream(pathFor(key));},
 async remove(key){await unlink(pathFor(key)).catch((e:any)=>{if(e?.code!=="ENOENT")throw e;});},
 async size(key){return(await stat(pathFor(key))).size;}
};}
export const emptyReadable=()=>Readable.from(Buffer.alloc(0));

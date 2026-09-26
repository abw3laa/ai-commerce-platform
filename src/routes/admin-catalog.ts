/* eslint-disable @typescript-eslint/no-explicit-any */
import type {FastifyInstance} from "fastify";
import type {AuthRepositories} from "../auth/types.js";
import type {AuthorizationRepository} from "../auth/authorization-types.js";
import {createAuthGuard} from "../auth/auth-guard.js";
import {createPermissionGuard} from "../auth/authorization-guard.js";
import type {CategoryRepository} from "../catalog/category-types.js";
import type {MediaRepository,MediaOwner} from "../catalog/media-types.js";
import type {MediaStore} from "../storage/local-media-store.js";
const allowed=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"],["image/gif","gif"],["video/mp4","mp4"],["video/webm","webm"]]);
const max=10*1024*1024;
export interface AdminCatalogOptions{deps:AuthRepositories;authorizationRepo:AuthorizationRepository;categoryRepo:CategoryRepository;mediaRepo:MediaRepository;mediaStore:MediaStore;isProduction:boolean;}
function slug(v:unknown){return typeof v==="string"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)?v:null;}
export async function adminCatalogRoutes(app:FastifyInstance,o:AdminCatalogOptions){
 const auth=createAuthGuard({...o.deps,isProduction:o.isProduction}),guard=createPermissionGuard(o.authorizationRepo,"products");
 const mediaAccessGuard=async(req:any,reply:any)=>{
  if(!req.adminUser)return reply.code(401).send({error:"unauthorized"});
  const media=await o.mediaRepo.get(req.params?.id);
  if(!media)return reply.code(404).send({error:"not_found"});
  const permissions=await o.authorizationRepo.getPermissionKeysForAdmin(req.adminUser.id);
  const required=media.ownerType==="payment_receipt"?"payments":"products";
  if(!permissions.includes(required as never))return reply.code(403).send({error:"forbidden"});
 };
 app.get("/categories",{preHandler:[auth,guard]},async()=>o.categoryRepo.list());
 app.post("/categories",{preHandler:[auth,guard]},async(req,reply)=>{const b=req.body&&typeof req.body==="object"?req.body as Record<string,unknown>:{};if(typeof b.name!=="string"||!b.name.trim()||!slug(b.slug))return reply.code(400).send({error:"invalid_category"});try{return reply.code(201).send(await o.categoryRepo.create({name:b.name.trim(),slug:b.slug as string}));}catch(e){if(e instanceof Error&&e.message==="category_conflict")return reply.code(409).send({error:e.message});throw e;}});
 app.patch("/categories/:id",{preHandler:[auth,guard]},async(req,reply)=>{const b=req.body&&typeof req.body==="object"?req.body as Record<string,unknown>:{};const v:Record<string,unknown>={};if(b.name!==undefined){if(typeof b.name!=="string"||!b.name.trim())return reply.code(400).send({error:"invalid_category"});v.name=b.name.trim();}if(b.slug!==undefined){if(!slug(b.slug))return reply.code(400).send({error:"invalid_category"});v.slug=b.slug;}if(b.isActive!==undefined){if(typeof b.isActive!=="boolean")return reply.code(400).send({error:"invalid_category"});v.isActive=b.isActive;}if(!Object.keys(v).length)return reply.code(400).send({error:"invalid_category"});try{const r=await o.categoryRepo.update((req.params as any).id,v as never);return r?reply.send(r):reply.code(404).send({error:"not_found"});}catch(e){if(e instanceof Error&&e.message==="category_conflict")return reply.code(409).send({error:e.message});throw e;}});
 app.get("/media/:id",{preHandler:[auth,mediaAccessGuard]},async(req,reply)=>{const m=await o.mediaRepo.get((req.params as any).id);if(!m)return reply.code(404).send({error:"not_found"});reply.type(m.mimeType);return reply.send(o.mediaStore.open(m.storageKey));});
 async function upload(req:any,reply:any,expected:MediaOwner){const id=(req.params as any).id as string;const q=req.query&&typeof req.query==="object"?req.query as Record<string,unknown>:{};const mime=typeof q.contentType==="string"?q.contentType:"";const ext=allowed.get(mime);if(!ext)return reply.code(415).send({error:"unsupported_media_type"});const kind=mime.startsWith("image/")?"image":"video";const name=typeof q.filename==="string"&&q.filename.trim()?q.filename.trim():`upload.${ext}`;const raw=Buffer.isBuffer(req.body)?req.body:typeof req.body==="string"?Buffer.from(req.body):null;if(!raw)return reply.code(400).send({error:"invalid_media_body"});try{const saved=await o.mediaStore.save({stream:raw,extension:ext,maxBytes:max});const media=await o.mediaRepo.create({ownerType:expected,ownerId:id,kind,originalName:name,mimeType:mime,storageKey:saved.key,sizeBytes:saved.sizeBytes,ocrText:null});return reply.code(201).send(media);}catch(e){if(e instanceof Error&&e.message==="media_too_large")return reply.code(413).send({error:e.message});throw e;}}
 app.post("/products/:id/media",{preHandler:[auth,guard]},async(req,reply)=>upload(req,reply,"product"));
 app.post("/offers/:id/media",{preHandler:[auth,guard]},async(req,reply)=>upload(req,reply,"offer"));
 app.get("/products/:id/media",{preHandler:[auth,guard]},async(req)=>o.mediaRepo.list("product",(req.params as any).id));
 app.get("/offers/:id/media",{preHandler:[auth,guard]},async(req)=>o.mediaRepo.list("offer",(req.params as any).id));
 app.delete("/media/:id",{preHandler:[auth,mediaAccessGuard]},async(req,reply)=>{const m=await o.mediaRepo.delete((req.params as any).id);if(!m)return reply.code(404).send({error:"not_found"});await o.mediaStore.remove(m.storageKey);return {deleted:true};});
}

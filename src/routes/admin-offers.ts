import type {FastifyInstance} from "fastify";
import type {AuthRepositories} from "../auth/types.js";
import type {AuthorizationRepository} from "../auth/authorization-types.js";
import {createAuthGuard} from "../auth/auth-guard.js";
import {createPermissionGuard} from "../auth/authorization-guard.js";
import type {OfferRepository} from "../catalog/offer-types.js";
export interface AdminOffersOptions{deps:AuthRepositories;authorizationRepo:AuthorizationRepository;offerRepo:OfferRepository;isProduction:boolean;}
const nn=(v:unknown):v is number=>typeof v==="number"&&Number.isInteger(v)&&v>=0;
function input(body:unknown){
 if(!body||typeof body!=="object")return null;const b=body as Record<string,unknown>;
 if(typeof b.name!=="string"||!b.name.trim()||typeof b.code!=="string"||!b.code.trim()||!nn(b.price)||!nn(b.quantity)||!Array.isArray(b.items))return null;
 const items=b.items.map(x=>{if(!x||typeof x!=="object")return null;const i=x as Record<string,unknown>;return typeof i.productId==="string"&&i.productId&&nn(i.quantity)?{productId:i.productId,quantity:i.quantity}:null;});
 if(items.some(x=>x===null)||items.length===0)return null;
 return {name:b.name.trim(),code:b.code.trim(),description:typeof b.description==="string"?b.description:null,price:b.price,quantity:b.quantity,
   startsAt:typeof b.startsAt==="string"?new Date(b.startsAt):null,endsAt:typeof b.endsAt==="string"?new Date(b.endsAt):null,
   items:items as Array<{productId:string;quantity:number}>};
}
export async function adminOffersRoutes(app:FastifyInstance,o:AdminOffersOptions){
 const auth=createAuthGuard({...o.deps,isProduction:o.isProduction}),guard=createPermissionGuard(o.authorizationRepo,"products");
 app.get("/offers",{preHandler:[auth,guard]},async()=>o.offerRepo.list());
 app.post("/offers",{preHandler:[auth,guard]},async(req,reply)=>{
  const v=input(req.body);if(!v)return reply.code(400).send({error:"invalid_offer"});
  try{return reply.code(201).send(await o.offerRepo.create(v));}catch(e){if(e instanceof Error&&e.message==="offer_code_conflict")return reply.code(409).send({error:e.message});if(e instanceof Error&&e.message==="product_not_found")return reply.code(400).send({error:e.message});throw e;}
 });
 app.patch("/offers/:id",{preHandler:[auth,guard]},async(req,reply)=>{
  const id=(req.params as {id?:string}).id;if(!id||!req.body||typeof req.body!=="object")return reply.code(400).send({error:"invalid_offer"});
  const b=req.body as Record<string,unknown>,v:Record<string,unknown>={};
  if(b.name!==undefined){if(typeof b.name!=="string"||!b.name.trim())return reply.code(400).send({error:"invalid_offer"});v.name=b.name.trim();}
  if(b.code!==undefined){if(typeof b.code!=="string"||!b.code.trim())return reply.code(400).send({error:"invalid_offer"});v.code=b.code.trim();}
  if(b.description!==undefined){if(b.description!==null&&typeof b.description!=="string")return reply.code(400).send({error:"invalid_offer"});v.description=b.description;}
  if(b.price!==undefined&&!nn(b.price))return reply.code(400).send({error:"invalid_offer"});if(b.price!==undefined)v.price=b.price;
  if(b.quantity!==undefined&&!nn(b.quantity))return reply.code(400).send({error:"invalid_offer"});if(b.quantity!==undefined)v.quantity=b.quantity;
  if(b.isActive!==undefined){if(typeof b.isActive!=="boolean")return reply.code(400).send({error:"invalid_offer"});v.isActive=b.isActive;}
  try{const r=await o.offerRepo.update(id,v as never);return r?reply.send(r):reply.code(404).send({error:"not_found"});}catch(e){if(e instanceof Error&&e.message==="offer_code_conflict")return reply.code(409).send({error:e.message});throw e;}
 });
}

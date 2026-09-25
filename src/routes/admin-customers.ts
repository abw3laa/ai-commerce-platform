import type {FastifyInstance} from "fastify";
import type {AuthRepositories} from "../auth/types.js";
import type {AuthorizationRepository} from "../auth/authorization-types.js";
import {createAuthGuard} from "../auth/auth-guard.js";
import {createPermissionGuard} from "../auth/authorization-guard.js";
import type {CustomerRepository} from "../customers/types.js";
export interface AdminCustomersOptions{deps:AuthRepositories;authorizationRepo:AuthorizationRepository;customerRepo:CustomerRepository;isProduction:boolean;}
function text(v:unknown){return typeof v==="string"&&v.trim()?v.trim():null;}
export async function adminCustomersRoutes(app:FastifyInstance,o:AdminCustomersOptions){
 const auth=createAuthGuard({...o.deps,isProduction:o.isProduction}),guard=createPermissionGuard(o.authorizationRepo,"customers");
 app.get("/customers",{preHandler:[auth,guard]},async()=>o.customerRepo.list());
 app.post("/customers",{preHandler:[auth,guard]},async(req,reply)=>{const b=req.body&&typeof req.body==="object"?req.body as Record<string,unknown>:{};const name=text(b.name),phone=text(b.phone);if(!name||!phone)return reply.code(400).send({error:"invalid_customer"});try{return reply.code(201).send(await o.customerRepo.create({name,phone,email:b.email===null?null:text(b.email),address:b.address===null?null:text(b.address),notes:b.notes===null?null:text(b.notes)}));}catch(e){if(e instanceof Error&&e.message==="customer_phone_conflict")return reply.code(409).send({error:e.message});throw e;}});
 app.patch("/customers/:id",{preHandler:[auth,guard]},async(req,reply)=>{const id=(req.params as {id?:string}).id;if(!id||!req.body||typeof req.body!=="object")return reply.code(400).send({error:"invalid_customer"});const b=req.body as Record<string,unknown>,v:Record<string,unknown>={};for(const k of ["name","phone","email","address","notes"]){if(b[k]!==undefined){if(b[k]!==null&&typeof b[k]!=="string")return reply.code(400).send({error:"invalid_customer"});if(k==="name"||k==="phone"){const s=text(b[k]);if(!s)return reply.code(400).send({error:"invalid_customer"});v[k]=s;}else v[k]=b[k];}}try{const r=await o.customerRepo.update(id,v);return r?reply.send(r):reply.code(404).send({error:"not_found"});}catch(e){if(e instanceof Error&&e.message==="customer_phone_conflict")return reply.code(409).send({error:e.message});throw e;}});
}
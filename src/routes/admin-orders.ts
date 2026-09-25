import {randomUUID} from "node:crypto";
import type {FastifyInstance} from "fastify";
import type {AuthRepositories} from "../auth/types.js";
import type {AuthorizationRepository} from "../auth/authorization-types.js";
import {createAuthGuard} from "../auth/auth-guard.js";
import {createPermissionGuard} from "../auth/authorization-guard.js";
import type {OrderRepository,OrderRecord} from "../orders/types.js";
import type {CustomerRepository} from "../customers/types.js";
import type {WhatsAppConnector} from "../whatsapp/types.js";
import {createOrderNotificationService} from "../automation/order-notifications.js";
import {ORDER_STATUSES,type OrderStatus} from "../orders/types.js";
export interface AdminOrdersOptions{deps:AuthRepositories;authorizationRepo:AuthorizationRepository;orderRepo:OrderRepository;customerRepo?:CustomerRepository;whatsapp?:WhatsAppConnector;isProduction:boolean;}
function positive(v:unknown):v is number{return typeof v==="number"&&Number.isInteger(v)&&v>0;}
export async function adminOrdersRoutes(app:FastifyInstance,o:AdminOrdersOptions){
 const auth=createAuthGuard({...o.deps,isProduction:o.isProduction}),guard=createPermissionGuard(o.authorizationRepo,"orders");
 app.get("/orders",{preHandler:[auth,guard]},async()=>o.orderRepo.list());
 app.post("/orders",{preHandler:[auth,guard]},async(req,reply)=>{
  const b=req.body&&typeof req.body==="object"?req.body as Record<string,unknown>:{},customerId=typeof b.customerId==="string"?b.customerId.trim():"";
  if(!customerId||!Array.isArray(b.items)||b.items.length===0)return reply.code(400).send({error:"invalid_order"});
  const items=b.items.map(x=>{if(!x||typeof x!=="object")return null;const i=x as Record<string,unknown>;return typeof i.productId==="string"&&i.productId.trim()&&positive(i.quantity)&&(i.variantId===undefined||i.variantId===null||typeof i.variantId==="string")?{productId:i.productId.trim(),variantId:typeof i.variantId==="string"?i.variantId:null,quantity:i.quantity}:null;});
  if(items.some(x=>x===null))return reply.code(400).send({error:"invalid_order"});
  try{return reply.code(201).send(await o.orderRepo.create({orderNumber:`ORD-${randomUUID().replaceAll("-","").slice(0,16).toUpperCase()}`,customerId,items:items as Array<{productId:string;variantId:string|null;quantity:number}>}));}
  catch(e){if(e instanceof Error&&["customer_not_found","product_not_found","variant_not_found"].includes(e.message))return reply.code(400).send({error:e.message});if(e instanceof Error&&e.message==="order_number_conflict")return reply.code(409).send({error:e.message});throw e;}
 });
 app.patch("/orders/:id/status",{preHandler:[auth,guard]},async(req,reply)=>{const id=(req.params as {id?:string}).id,b=req.body&&typeof req.body==="object"?req.body as Record<string,unknown>:{},status=b.status;if(!id||typeof status!=="string"||!ORDER_STATUSES.includes(status as OrderStatus))return reply.code(400).send({error:"invalid_status"});const r=await o.orderRepo.updateStatus(id,status as OrderStatus);if(!r)return reply.code(404).send({error:"not_found"});if("error" in r)return reply.code(409).send(r);if(o.customerRepo&&o.whatsapp){const customers=await o.customerRepo.list();const target=customers.find(x=>x.id===r.customerId);if(target){try{await createOrderNotificationService(o.whatsapp).notifyStatus(r as OrderRecord,target.phone,r.status);}catch(error){app.log.warn({error,orderId:r.id},"order notification failed");}}}return reply.send(r);});
}
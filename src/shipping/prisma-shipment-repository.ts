import type {PrismaClient} from "../../generated/prisma/client.js";
import type {ShipmentRepository,ShipmentRecord,ShipmentStatus} from "./types.js";
const next:Record<ShipmentStatus,ShipmentStatus[]>={pending:["shipped"],shipped:["on_the_way"],on_the_way:["delivered"],delivered:[]};
function code(e:unknown){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"?e.code:undefined;}
export function createPrismaShipmentRepository(prisma:PrismaClient):ShipmentRepository{return{
 async getByOrderId(orderId){return prisma.shipment.findUnique({where:{orderId}}) as Promise<ShipmentRecord|null>;},
 async upsert(i){const order=await prisma.order.findUnique({where:{id:i.orderId}});if(!order)throw new Error("order_not_found");try{return prisma.shipment.upsert({where:{orderId:i.orderId},create:{orderId:i.orderId,carrier:i.carrier??null,trackingCode:i.trackingCode??null,trackingUrl:i.trackingUrl??null},update:{carrier:i.carrier??null,trackingCode:i.trackingCode??null,trackingUrl:i.trackingUrl??null}}) as unknown as Promise<ShipmentRecord>;}catch(e){if(code(e)==="P2025")throw new Error("order_not_found",{cause:e});throw e;}},
 async setStatus(id,status){const current=await prisma.shipment.findUnique({where:{id}});if(!current)return null;if(!(next[current.status as ShipmentStatus]??[]).includes(status))return {error:"invalid_transition"};return prisma.shipment.update({where:{id},data:{status,shippedAt:status==="shipped"?new Date():current.shippedAt,deliveredAt:status==="delivered"?new Date():current.deliveredAt}}) as unknown as Promise<ShipmentRecord>;}
};}
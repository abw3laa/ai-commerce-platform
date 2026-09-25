import type {ShipmentRepository,ShipmentRecord,ShipmentStatus} from "./types.js";
import {SHIPMENT_STATUSES} from "./types.js";
const next:Record<ShipmentStatus,ShipmentStatus[]>={pending:["shipped"],shipped:["on_the_way"],on_the_way:["delivered"],delivered:[]};
export function createInMemoryShipmentRepository():ShipmentRepository{const data:ShipmentRecord[]=[];let n=0;return{
 async getByOrderId(id){return data.find(x=>x.orderId===id)??null;},
 async upsert(i){const old=data.find(x=>x.orderId===i.orderId);if(old){Object.assign(old,{carrier:i.carrier??old.carrier,trackingCode:i.trackingCode??old.trackingCode,trackingUrl:i.trackingUrl??old.trackingUrl,updatedAt:new Date()});return old;}const now=new Date(),r={id:`shipment-${++n}`,orderId:i.orderId,status:"pending" as ShipmentStatus,carrier:i.carrier??null,trackingCode:i.trackingCode??null,trackingUrl:i.trackingUrl??null,shippedAt:null,deliveredAt:null,createdAt:now,updatedAt:now};data.push(r);return r;},
 async setStatus(id,status){if(!SHIPMENT_STATUSES.includes(status))throw new Error("invalid_status");const r=data.find(x=>x.id===id);if(!r)return null;if(!(next[r.status]??[]).includes(status))return {error:"invalid_transition"};r.status=status;if(status==="shipped")r.shippedAt=new Date();if(status==="delivered")r.deliveredAt=new Date();r.updatedAt=new Date();return r;}
};}
import type {OrderRepository,OrderRecord,OrderStatus} from "./types.js";
import type {ProductRepository} from "../catalog/types.js";
import type {CustomerRepository} from "../customers/types.js";
import {ORDER_STATUSES} from "./types.js";
const next:{[K in OrderStatus]?:OrderStatus[]}={received:["review","cancelled"],review:["preparing","cancelled"],preparing:["shipped","cancelled"],shipped:["on_the_way"],on_the_way:[],cancelled:[]};
export function createInMemoryOrderRepository(customers:CustomerRepository,products:ProductRepository):OrderRepository{
 const data:OrderRecord[]=[];let seq=0;
 return {
  async list(){return [...data];},
  async create(i){if(!(await customers.list()).some(c=>c.id===i.customerId))throw new Error("customer_not_found");
   const ps=await products.list(),items=[];
   for(const x of i.items){const p=ps.find(p=>p.id===x.productId);if(!p)throw new Error("product_not_found");
    const v=x.variantId? p.variants.find(v=>v.id===x.variantId):null;if(x.variantId&&!v)throw new Error("variant_not_found");
    const price=v?.priceOverride??p.price;items.push({id:`item-${++seq}`,productId:p.id,variantId:v?.id??null,productName:p.name,sku:v?.sku??null,size:v?.size??null,color:v?.color??null,unitPrice:price,quantity:x.quantity});}
   const now=new Date(),r={id:`order-${++seq}`,orderNumber:i.orderNumber,customerId:i.customerId,status:"received" as OrderStatus,createdAt:now,updatedAt:now,items,total:items.reduce((s,x)=>s+x.unitPrice*x.quantity,0)};
   data.push(r);return r;},
  async updateStatus(id,status){if(!ORDER_STATUSES.includes(status))throw new Error("invalid_status");const r=data.find(x=>x.id===id);if(!r)return null;if(!(next[r.status]??[]).includes(status))return {error:"invalid_transition"};r.status=status;r.updatedAt=new Date();return r;}
 };
}
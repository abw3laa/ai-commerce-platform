import type {PrismaClient} from "../../generated/prisma/client.js";
import type {OrderRepository,OrderRecord,OrderItemRecord,OrderStatus} from "./types.js";
import {ORDER_STATUSES} from "./types.js";
type Row={id:string;orderNumber:string;customerId:string;status:string;createdAt:Date;updatedAt:Date;items:Array<{id:string;productId:string;variantId:string|null;productName:string;sku:string|null;size:string|null;color:string|null;unitPrice:number;quantity:number}>};
const next:Record<OrderStatus,OrderStatus[]>={received:["review","cancelled"],review:["preparing","cancelled"],preparing:["shipped","cancelled"],shipped:["on_the_way"],on_the_way:[],cancelled:[]};
function map(row:Row):OrderRecord{const items:OrderItemRecord[]=row.items;return {...row,status:row.status as OrderStatus,items,total:items.reduce((s,x)=>s+x.unitPrice*x.quantity,0)};}
function code(e:unknown){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"?e.code:undefined;}
export function createPrismaOrderRepository(prisma:PrismaClient):OrderRepository{return{
 async list(){const rows=await prisma.order.findMany({orderBy:{createdAt:"desc"},include:{items:{orderBy:{id:"asc"}}}});return rows.map(x=>map(x as Row));},
 async create(i){try{
  const customer=await prisma.customer.findUnique({where:{id:i.customerId}});if(!customer)throw new Error("customer_not_found");
  const products=await Promise.all(i.items.map(x=>prisma.product.findUnique({where:{id:x.productId},include:{variants:true}})));
  const prepared=i.items.map((x,n)=>{const p=products[n];if(!p)throw new Error("product_not_found");const v=x.variantId?p.variants.find(v=>v.id===x.variantId):undefined;if(x.variantId&&!v)throw new Error("variant_not_found");return{productId:p.id,variantId:v?.id??null,productName:p.name,sku:v?.sku??null,size:v?.size??null,color:v?.color??null,unitPrice:v?.priceOverride??p.price,quantity:x.quantity};});
  const row=await prisma.order.create({data:{orderNumber:i.orderNumber,customerId:i.customerId,status:"received",items:{create:prepared.map(x=>({product:{connect:{id:x.productId}},...(x.variantId ? {variant:{connect:{id:x.variantId}}} : {}),productName:x.productName,sku:x.sku,size:x.size,color:x.color,unitPrice:x.unitPrice,quantity:x.quantity}))}},include:{items:true}});
  return map(row as Row);
 }catch(e){if(e instanceof Error&&["customer_not_found","product_not_found","variant_not_found"].includes(e.message))throw e;if(code(e)==="P2002")throw new Error("order_number_conflict",{cause:e});throw e;}},
 async updateStatus(id,status){if(!ORDER_STATUSES.includes(status))throw new Error("invalid_status");const current=await prisma.order.findUnique({where:{id}});if(!current)return null;if(!(next[current.status as OrderStatus]??[]).includes(status))return {error:"invalid_transition"};const changed=await prisma.order.updateMany({where:{id,status:current.status},data:{status}});if(changed.count===0)return {error:"invalid_transition"};const row=await prisma.order.findUnique({where:{id},include:{items:true}});return row?map(row as Row):null;}
};}
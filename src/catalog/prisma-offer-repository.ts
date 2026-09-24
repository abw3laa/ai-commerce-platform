import type { PrismaClient } from "../../generated/prisma/client.js";
import type { OfferRepository, OfferRecord } from "./offer-types.js";
type OfferRow={id:string;name:string;code:string;description:string|null;price:number;quantity:number;isActive:boolean;startsAt:Date|null;endsAt:Date|null;items:Array<{productId:string;quantity:number}>};
function map(row:OfferRow):OfferRecord{return {id:row.id,name:row.name,code:row.code,description:row.description,price:Number(row.price),quantity:row.quantity,isActive:row.isActive,startsAt:row.startsAt,endsAt:row.endsAt,items:row.items.map(x=>({productId:x.productId,quantity:x.quantity}))};}
function errorCode(error:unknown):string|undefined{return typeof error==="object"&&error!==null&&"code" in error&&typeof error.code==="string"?error.code:undefined;}
export function createPrismaOfferRepository(prisma:PrismaClient):OfferRepository{return{
 async list(){const rows=await prisma.offer.findMany({orderBy:{createdAt:"desc"},include:{items:true}});return rows.map(row=>map(row as OfferRow));},
 async create(input){try{const row=await prisma.offer.create({data:{name:input.name,code:input.code,description:input.description??null,price:input.price,quantity:input.quantity,isActive:true,startsAt:input.startsAt??null,endsAt:input.endsAt??null,items:{create:input.items}},include:{items:true}});return map(row as unknown as OfferRow);
 }catch(error){const code=errorCode(error);if(code==="P2002")throw new Error("offer_code_conflict",{cause:error});if(code==="P2003")throw new Error("product_not_found",{cause:error});throw error;}},
 async update(id,input){try{const row=await prisma.offer.update({where:{id},data:input,include:{items:true}});return map(row as unknown as OfferRow);
 }catch(error){const code=errorCode(error);if(code==="P2025")return null;if(code==="P2002")throw new Error("offer_code_conflict",{cause:error});throw error;}}
};}
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { OfferRepository, OfferRecord } from "./offer-types.js";
function map(row:any):OfferRecord{return {id:row.id,name:row.name,code:row.code,description:row.description,price:Number(row.price),quantity:row.quantity,isActive:row.isActive,startsAt:row.startsAt,endsAt:row.endsAt,items:row.items.map((x:any)=>({productId:x.productId,quantity:x.quantity}))};}
export function createPrismaOfferRepository(prisma:PrismaClient):OfferRepository{
 return {
  async list(){return (await prisma.offer.findMany({orderBy:{createdAt:"desc"},include:{items:true}})).map(map);},
  async create(input){try{return map(await prisma.offer.create({data:{name:input.name,code:input.code,description:input.description??null,price:input.price,quantity:input.quantity,isActive:true,startsAt:input.startsAt??null,endsAt:input.endsAt??null,items:{create:input.items}},include:{items:true}}));}catch(e:any){if(e?.code==="P2002")throw new Error("offer_code_conflict");if(e?.code==="P2003")throw new Error("product_not_found");throw e;}},
  async update(id,input){try{return map(await prisma.offer.update({where:{id},data:input,include:{items:true}}));}catch(e:any){if(e?.code==="P2025")return null;if(e?.code==="P2002")throw new Error("offer_code_conflict");throw e;}}
 };
}
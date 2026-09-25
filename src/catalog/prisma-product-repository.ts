import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ProductRepository, ProductRecord, ProductVariantRecord } from "./types.js";

type ProductRow = {
 id:string; name:string; description:string|null; productCode:string; price:number; cost:number|null;
 currency:string; isActive:boolean; createdAt:Date; updatedAt:Date;
 variants:Array<{id:string;productId:string;sku:string;size:string|null;color:string|null;stockQuantity:number;priceOverride:number|null}>
};
function mapProduct(row:ProductRow):ProductRecord & {variants:ProductVariantRecord[]} {
 return {id:row.id,name:row.name,description:row.description,productCode:row.productCode,price:Number(row.price),
 cost:row.cost===null?null:Number(row.cost),currency:row.currency,isActive:row.isActive,createdAt:row.createdAt,
 updatedAt:row.updatedAt,variants:row.variants.map(v=>({id:v.id,productId:v.productId,sku:v.sku,size:v.size,color:v.color,
 stockQuantity:v.stockQuantity,priceOverride:v.priceOverride===null?null:Number(v.priceOverride)}))};
}
function errorCode(error:unknown):string|undefined { return typeof error==="object"&&error!==null&&"code" in error&&typeof error.code==="string"?error.code:undefined; }
function errorTarget(error:unknown):string { if(typeof error!=="object"||error===null||!("meta" in error))return ""; const meta=error.meta;
 return typeof meta==="object"&&meta!==null&&"target" in meta?String(meta.target):""; }
export function createPrismaProductRepository(prisma:PrismaClient):ProductRepository {
 return {
  async list(){const rows=await prisma.product.findMany({orderBy:{createdAt:"desc"},include:{variants:{orderBy:{sku:"asc"}}}});return rows.map(row=>mapProduct(row as ProductRow));},
  async create(input){try{
   const row=await prisma.product.create({data:{name:input.name,description:input.description??null,productCode:input.productCode,price:input.price,cost:input.cost??null,currency:input.currency,isActive:true,variants:{create:input.variants?.map(v=>({sku:v.sku,size:v.size??null,color:v.color??null,stockQuantity:v.stockQuantity,priceOverride:v.priceOverride??null}))??[]}},include:{variants:true}});
   return mapProduct(row as unknown as ProductRow);
  } catch(error){const code=errorCode(error);if(code==="P2002")throw new Error(errorTarget(error).includes("sku")?"variant_sku_conflict":"product_code_conflict",{cause:error});throw error;}},
  async update(id,input){try{
   const row=await prisma.product.update({where:{id},data:input,include:{variants:true}});return mapProduct(row as unknown as ProductRow);
  } catch(error){const code=errorCode(error);if(code==="P2025")return null;if(code==="P2002")throw new Error("product_code_conflict",{cause:error});throw error;}},
  async setVariantStock(productId,variantId,stockQuantity){try{
   const result=await prisma.productVariant.updateMany({where:{id:variantId,productId},data:{stockQuantity}});if(result.count===0)return null;
   const row=await prisma.productVariant.findUnique({where:{id:variantId}});if(!row)return null;
   return {id:row.id,productId:row.productId,sku:row.sku,size:row.size,color:row.color,stockQuantity:row.stockQuantity,priceOverride:row.priceOverride===null?null:Number(row.priceOverride)};
  } catch(error){if(errorCode(error)==="P2025")return null;throw error;}},
 };
}
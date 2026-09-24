import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ProductRepository, ProductRecord, ProductVariantRecord } from "./types.js";

function mapProduct(row:any): ProductRecord & {variants:ProductVariantRecord[]} {
  return {id:row.id,name:row.name,description:row.description,productCode:row.productCode,
    price:Number(row.price),cost:row.cost===null?null:Number(row.cost),currency:row.currency,
    isActive:row.isActive,createdAt:row.createdAt,updatedAt:row.updatedAt,
    variants:row.variants.map((v:any)=>({id:v.id,productId:v.productId,sku:v.sku,size:v.size,color:v.color,
      stockQuantity:v.stockQuantity,priceOverride:v.priceOverride===null?null:Number(v.priceOverride)}))};
}
export function createPrismaProductRepository(prisma:PrismaClient):ProductRepository {
  return {
    async list() {
      const rows=await prisma.product.findMany({orderBy:{createdAt:"desc"},include:{variants:{orderBy:{sku:"asc"}}}});
      return rows.map(mapProduct);
    },
    async create(input) {
      try {
        const row=await prisma.product.create({
          data:{name:input.name,description:input.description??null,productCode:input.productCode,price:input.price,
            cost:input.cost??null,currency:input.currency,isActive:true,
            variants:{create:input.variants?.map(v=>({sku:v.sku,size:v.size??null,color:v.color??null,
              stockQuantity:v.stockQuantity,priceOverride:v.priceOverride??null}))??[]}},
          include:{variants:true}});
        return mapProduct(row);
      } catch(e:any) {
        if(e?.code==="P2002"){const target=Array.isArray(e.meta?.target)?e.meta.target.join(","):String(e.meta?.target??"");
          throw new Error(target.includes("sku")?"variant_sku_conflict":"product_code_conflict");}
        throw e;
      }
    },
    async update(id,input) {
      try {
        const row=await prisma.product.update({where:{id},data:input,include:{variants:true}});
        return mapProduct(row);
      } catch(e:any) {
        if(e?.code==="P2025")return null;
        if(e?.code==="P2002")throw new Error("product_code_conflict");
        throw e;
      }
    },
    async setVariantStock(productId,variantId,stockQuantity) {
      try {
        const row=await prisma.productVariant.update({where:{id:variantId,productId},data:{stockQuantity}});
        return {id:row.id,productId:row.productId,sku:row.sku,size:row.size,color:row.color,
          stockQuantity:row.stockQuantity,priceOverride:row.priceOverride===null?null:Number(row.priceOverride)};
      } catch(e:any) { if(e?.code==="P2025")return null; throw e; }
    },
  };
}

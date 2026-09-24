import type { ProductRepository, ProductRecord, ProductVariantRecord } from "./types.js";
type ProductWithVariants = ProductRecord & { variants: ProductVariantRecord[] };
const copy = <T>(value:T):T => structuredClone(value);
export function createInMemoryProductRepository(seed:ProductWithVariants[]=[]):ProductRepository {
  const products:ProductWithVariants[] = seed.map(copy);
  return {
    async list(){ return copy(products); },
    async create(input){
      if(products.some(p=>p.productCode===input.productCode)) throw new Error("product_code_conflict");
      if(input.variants?.some(v=>products.some(p=>p.variants.some(x=>x.sku===v.sku)))) throw new Error("variant_sku_conflict");
      const now=new Date(), id="product-"+(products.length+1);
      const product:ProductWithVariants={id,name:input.name,description:input.description??null,productCode:input.productCode,
        price:input.price,cost:input.cost??null,currency:input.currency,isActive:true,createdAt:now,updatedAt:now,variants:[]};
      product.variants=(input.variants??[]).map((v,i)=>({id:"variant-"+(products.length+1)+"-"+(i+1),productId:id,sku:v.sku,size:v.size??null,color:v.color??null,stockQuantity:v.stockQuantity,priceOverride:v.priceOverride??null}));
      products.push(product); return copy(product);
    },
    async update(id,input){
      const product=products.find(p=>p.id===id); if(!product)return null;
      if(input.productCode&&products.some(p=>p.id!==id&&p.productCode===input.productCode)) throw new Error("product_code_conflict");
      Object.assign(product,input); product.updatedAt=new Date(); return copy(product);
    },
    async setVariantStock(productId,variantId,stockQuantity){
      const product=products.find(p=>p.id===productId), variant=product?.variants.find(v=>v.id===variantId);
      if(!variant)return null; variant.stockQuantity=stockQuantity; return copy(variant);
    },
  };
}
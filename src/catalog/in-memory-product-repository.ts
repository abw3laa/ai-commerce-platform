import type { ProductRepository, ProductRecord, ProductVariantRecord } from "./types.js";
const copy=<T>(value:T):T=>structuredClone(value);
export function createInMemoryProductRepository(seed:Array<ProductRecord&{variants:ProductVariantRecord[]}>=[]):ProductRepository{
  const products=seed.map(copy);
  return {
    async list(){return copy(products);},
    async create(input){
      if(products.some(p=>p.productCode===input.productCode))throw new Error("product_code_conflict");
      if(input.variants?.some(v=>products.some(p=>p.variants.some(x=>x.sku===v.sku))))throw new Error("variant_sku_conflict");
      const now=new Date(), id="product-"+(products.length+1);
      const product:any={id,name:input.name,description:input.description??null,productCode:input.productCode,
        price:input.price,cost:input.cost??null,currency:input.currency,isActive:true,createdAt:now,updatedAt:now,variants:[]};
      product.variants=(input.variants??[]).map((v,i)=>({id:"variant-"+(products.length+1)+"-"+(i+1),productId:id,...v}));
      products.push(product); return copy(product);
    },
    async update(id,input){
      const p:any=products.find(x=>x.id===id); if(!p)return null;
      if(input.productCode&&products.some(x=>x.id!==id&&x.productCode===input.productCode))throw new Error("product_code_conflict");
      Object.assign(p,input);p.updatedAt=new Date();return copy(p);
    },
    async setVariantStock(productId,variantId,stockQuantity){
      const p:any=products.find(x=>x.id===productId),v=p?.variants.find((x:any)=>x.id===variantId);
      if(!v)return null;v.stockQuantity=stockQuantity;return copy(v);
    },
  };
}

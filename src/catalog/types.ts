export interface ProductRecord {
  id: string; name: string; description: string | null; productCode: string;
  price: number; cost: number | null; currency: string; isActive: boolean;
  categoryId?: string|null; createdAt: Date; updatedAt: Date;
}
export interface ProductVariantRecord {
  id: string; productId: string; sku: string; size: string | null; color: string | null;
  stockQuantity: number; priceOverride: number | null;
}
export interface ProductRepository {
  list(): Promise<Array<ProductRecord & { variants: ProductVariantRecord[] }>>;
  create(input: { name:string; description?:string|null; productCode:string; price:number; cost?:number|null; currency:string; categoryId?:string|null;
    variants?:Array<{sku:string;size?:string|null;color?:string|null;stockQuantity:number;priceOverride?:number|null}> }): Promise<ProductRecord & { variants: ProductVariantRecord[] }>;
  update(id:string,input: Partial<{name:string;description:string|null;productCode:string;price:number;cost:number|null;currency:string;isActive:boolean;categoryId:string|null}>): Promise<(ProductRecord & { variants: ProductVariantRecord[] })|null>;
  setVariantStock(productId:string,variantId:string,stockQuantity:number): Promise<ProductVariantRecord|null>;
}

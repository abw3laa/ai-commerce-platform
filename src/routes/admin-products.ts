import type { FastifyInstance } from "fastify";
import type { AuthRepositories } from "../auth/types.js";
import type { AuthorizationRepository } from "../auth/authorization-types.js";
import { createAuthGuard } from "../auth/auth-guard.js";
import { createPermissionGuard } from "../auth/authorization-guard.js";
import type { ProductRepository } from "../catalog/types.js";

export interface AdminProductsOptions {
  deps: AuthRepositories; authorizationRepo: AuthorizationRepository;
  productRepo: ProductRepository; isProduction: boolean;
}
function nonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}
function createInput(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim() ||
      typeof b.productCode !== "string" || !b.productCode.trim() ||
      !nonNegativeInt(b.price)) return null;
  if (b.variants !== undefined && !Array.isArray(b.variants)) return null;
  const variants = (b.variants ?? []).map((item) => {
    if (!item || typeof item !== "object") return null;
    const v = item as Record<string, unknown>;
    if (typeof v.sku !== "string" || !v.sku.trim() || !nonNegativeInt(v.stockQuantity)) return null;
    if (v.priceOverride !== undefined && v.priceOverride !== null && !nonNegativeInt(v.priceOverride)) return null;
    return { sku:v.sku.trim(), size:typeof v.size==="string"?v.size:null,
      color:typeof v.color==="string"?v.color:null, stockQuantity:v.stockQuantity,
      priceOverride:v.priceOverride===undefined?null:v.priceOverride as number|null };
  });
  if (variants.some(v => v === null)) return null;
  return { name:b.name.trim(), description:typeof b.description==="string"?b.description:null,
    productCode:b.productCode.trim(), price:b.price,
    cost:b.cost===undefined||b.cost===null?null:nonNegativeInt(b.cost)?b.cost:null,
    currency:typeof b.currency==="string"&&b.currency.trim()?b.currency.trim().toUpperCase():"TRY",
    categoryId:b.categoryId===undefined||b.categoryId===null?null:typeof b.categoryId==="string"?b.categoryId:null,
    variants:variants as Array<{sku:string;size:string|null;color:string|null;stockQuantity:number;priceOverride:number|null}> };
}
export async function adminProductsRoutes(app: FastifyInstance, options: AdminProductsOptions): Promise<void> {
  const auth = createAuthGuard({...options.deps, isProduction:options.isProduction});
  const products = createPermissionGuard(options.authorizationRepo, "products");
  const inventory = createPermissionGuard(options.authorizationRepo, "inventory");

  app.get("/products", {preHandler:[auth,products]}, async () => options.productRepo.list());

  app.post("/products", {preHandler:[auth,products]}, async (request,reply) => {
    const input=createInput(request.body);
    if(!input) return reply.code(400).send({error:"invalid_product"});
    try { return reply.code(201).send(await options.productRepo.create(input)); }
    catch(e) {
      if(e instanceof Error && e.message==="product_code_conflict") return reply.code(409).send({error:"product_code_conflict"});
      if(e instanceof Error && e.message==="variant_sku_conflict") return reply.code(409).send({error:"variant_sku_conflict"});
      if(e instanceof Error && e.message==="category_not_found") return reply.code(400).send({error:"category_not_found"});
      throw e;
    }
  });

  app.patch("/products/:id", {preHandler:[auth,products]}, async (request,reply) => {
    const id=(request.params as {id?:string}).id;
    if(!id || !request.body || typeof request.body!=="object") return reply.code(400).send({error:"invalid_product"});
    const b=request.body as Record<string,unknown>, input:Record<string,unknown>={};
    if(b.name!==undefined){if(typeof b.name!=="string"||!b.name.trim())return reply.code(400).send({error:"invalid_product"});input.name=b.name.trim();}
    if(b.description!==undefined){if(b.description!==null&&typeof b.description!=="string")return reply.code(400).send({error:"invalid_product"});input.description=b.description;}
    if(b.productCode!==undefined){if(typeof b.productCode!=="string"||!b.productCode.trim())return reply.code(400).send({error:"invalid_product"});input.productCode=b.productCode.trim();}
    if(b.price!==undefined){if(!nonNegativeInt(b.price))return reply.code(400).send({error:"invalid_product"});input.price=b.price;}
    if(b.cost!==undefined){if(b.cost!==null&&!nonNegativeInt(b.cost))return reply.code(400).send({error:"invalid_product"});input.cost=b.cost;}
    if(b.currency!==undefined){if(typeof b.currency!=="string"||!b.currency.trim())return reply.code(400).send({error:"invalid_product"});input.currency=b.currency.trim().toUpperCase();}
    if(b.categoryId!==undefined){if(b.categoryId!==null&&typeof b.categoryId!=="string")return reply.code(400).send({error:"invalid_product"});input.categoryId=b.categoryId;}
    if(b.isActive!==undefined){if(typeof b.isActive!=="boolean")return reply.code(400).send({error:"invalid_product"});input.isActive=b.isActive;}
    try { const result=await options.productRepo.update(id,input as never); return result?reply.send(result):reply.code(404).send({error:"not_found"}); }
    catch(e){if(e instanceof Error&&e.message==="product_code_conflict")return reply.code(409).send({error:"product_code_conflict"});if(e instanceof Error&&e.message==="category_not_found")return reply.code(400).send({error:"category_not_found"});throw e;}
  });

  app.patch("/products/:productId/variants/:variantId/stock", {preHandler:[auth,inventory]}, async (request,reply) => {
    const p=request.params as {productId?:string;variantId?:string};
    const body=request.body;
    const stock=body&&typeof body==="object"?(body as Record<string,unknown>).stockQuantity:undefined;
    if(!p.productId||!p.variantId||!nonNegativeInt(stock)) return reply.code(400).send({error:"invalid_stock"});
    const result=await options.productRepo.setVariantStock(p.productId,p.variantId,stock);
    return result?reply.send(result):reply.code(404).send({error:"not_found"});
  });
}

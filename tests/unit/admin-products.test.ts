import {describe,it,expect} from "vitest";
import Fastify from "fastify";
import {adminProductsRoutes} from "../../src/routes/admin-products.js";
import {createFakeAuthRepositories} from "../helpers/fake-repositories.js";
import {generateSessionToken,hashSessionToken} from "../../src/auth/session-token.js";
import type {AuthorizationRepository} from "../../src/auth/authorization-types.js";
import {createInMemoryProductRepository} from "../../src/catalog/in-memory-product-repository.js";

async function appFor(permissions:string[]){
  const app=Fastify(),auth=createFakeAuthRepositories([{id:"admin-1",email:"owner@example.com",passwordHash:"unused",isActive:true}]);
  const token=generateSessionToken();
  await auth.adminSessionRepo.create({adminUserId:"admin-1",tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+60000)});
  const authorizationRepo:AuthorizationRepository={async getPermissionKeysForAdmin(){return permissions as readonly string[];}};
  await app.register(adminProductsRoutes,{deps:auth,authorizationRepo,productRepo:createInMemoryProductRepository(),isProduction:false});
  return {app,token};
}
describe("admin products and inventory",()=>{
  it("denies product access without products permission",async()=>{
    const {app,token}=await appFor([]);
    const r=await app.inject({method:"GET",url:"/products",headers:{cookie:"admin_session="+token}});
    expect(r.statusCode).toBe(403);await app.close();
  });
  it("creates and lists a product with variants",async()=>{
    const {app,token}=await appFor(["products"]);
    const create=await app.inject({method:"POST",url:"/products",headers:{cookie:"admin_session="+token},
      payload:{name:"Classic Shirt",productCode:"SH-001",price:1200,currency:"TRY",
        variants:[{sku:"SH-001-BLK-M",size:"M",color:"Black",stockQuantity:5}]}});
    expect(create.statusCode).toBe(201);
    const list=await app.inject({method:"GET",url:"/products",headers:{cookie:"admin_session="+token}});
    expect(list.statusCode).toBe(200);expect(list.json()[0].variants[0].stockQuantity).toBe(5);await app.close();
  });
  it("requires inventory permission to change stock",async()=>{
    const {app,token}=await appFor(["products"]);
    const create=await app.inject({method:"POST",url:"/products",headers:{cookie:"admin_session="+token},
      payload:{name:"Watch",productCode:"W-001",price:500,variants:[{sku:"W-001-ONE",stockQuantity:2}]}});
    const r=await app.inject({method:"PATCH",url:"/products/"+create.json().id+"/variants/"+create.json().variants[0].id+"/stock",
      headers:{cookie:"admin_session="+token},payload:{stockQuantity:9}});
    expect(r.statusCode).toBe(403);await app.close();
  });
  it("updates stock with inventory permission",async()=>{
    const {app,token}=await appFor(["products","inventory"]);
    const create=await app.inject({method:"POST",url:"/products",headers:{cookie:"admin_session="+token},
      payload:{name:"Watch",productCode:"W-002",price:500,variants:[{sku:"W-002-ONE",stockQuantity:2}]}});
    const r=await app.inject({method:"PATCH",url:"/products/"+create.json().id+"/variants/"+create.json().variants[0].id+"/stock",
      headers:{cookie:"admin_session="+token},payload:{stockQuantity:9}});
    expect(r.statusCode).toBe(200);expect(r.json().stockQuantity).toBe(9);await app.close();
  });
});

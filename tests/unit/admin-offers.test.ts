import {describe,it,expect} from "vitest";
import Fastify from "fastify";
import {adminOffersRoutes} from "../../src/routes/admin-offers.js";
import {createFakeAuthRepositories} from "../helpers/fake-repositories.js";
import {generateSessionToken,hashSessionToken} from "../../src/auth/session-token.js";
import type {AuthorizationRepository} from "../../src/auth/authorization-types.js";
import type {OfferRepository,OfferRecord} from "../../src/catalog/offer-types.js";

function fakeOfferRepo():OfferRepository{
 const data:OfferRecord[]=[];
 return {
  async list(){return data;},
  async create(i){const r:OfferRecord={id:"offer-1",name:i.name,code:i.code,description:i.description??null,price:i.price,quantity:i.quantity,isActive:true,startsAt:i.startsAt??null,endsAt:i.endsAt??null,items:i.items};data.push(r);return r;},
  async update(){return data[0]??null;}
 };
}
async function setup(perms:string[]){
 const app=Fastify(),auth=createFakeAuthRepositories([{id:"a1",email:"o@example.com",passwordHash:"x",isActive:true}]),token=generateSessionToken();
 await auth.adminSessionRepo.create({adminUserId:"a1",tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+60000)});
 const authorizationRepo:AuthorizationRepository={async getPermissionKeysForAdmin(){return perms as readonly string[];}};
 await app.register(adminOffersRoutes,{deps:auth,authorizationRepo,offerRepo:fakeOfferRepo(),isProduction:false});
 return {app,token};
}
describe("admin offers",()=>{
 it("requires products permission",async()=>{const x=await setup([]);const r=await x.app.inject({method:"GET",url:"/offers",headers:{cookie:"admin_session="+x.token}});expect(r.statusCode).toBe(403);await x.app.close();});
 it("creates a bundle offer",async()=>{const x=await setup(["products"]);const r=await x.app.inject({method:"POST",url:"/offers",headers:{cookie:"admin_session="+x.token},payload:{name:"7 Shirts",code:"4937",price:1000,quantity:7,items:[{productId:"p1",quantity:7}]}});expect(r.statusCode).toBe(201);expect(r.json().code).toBe("4937");await x.app.close();});
});

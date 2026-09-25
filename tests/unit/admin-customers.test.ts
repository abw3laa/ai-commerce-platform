import {describe,it,expect} from "vitest";
import Fastify from "fastify";
import {adminCustomersRoutes} from "../../src/routes/admin-customers.js";
import {createFakeAuthRepositories} from "../helpers/fake-repositories.js";
import {generateSessionToken,hashSessionToken} from "../../src/auth/session-token.js";
import type {AuthorizationRepository} from "../../src/auth/authorization-types.js";
import {createInMemoryCustomerRepository} from "../../src/customers/in-memory-customer-repository.js";
async function setup(perms:string[]){const app=Fastify(),auth=createFakeAuthRepositories([{id:"a1",email:"o@example.com",passwordHash:"x",isActive:true}]),token=generateSessionToken();await auth.adminSessionRepo.create({adminUserId:"a1",tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+60000)});const authorizationRepo:AuthorizationRepository={async getPermissionKeysForAdmin(){return [...perms] as never;}};await app.register(adminCustomersRoutes,{deps:auth,authorizationRepo,customerRepo:createInMemoryCustomerRepository(),isProduction:false});return{app,token};}
describe("admin customers",()=>{it("requires customers permission",async()=>{const x=await setup([]);const r=await x.app.inject({method:"GET",url:"/customers",headers:{cookie:"admin_session="+x.token}});expect(r.statusCode).toBe(403);await x.app.close();});
it("creates and updates a customer",async()=>{const x=await setup(["customers"]);const c=await x.app.inject({method:"POST",url:"/customers",headers:{cookie:"admin_session="+x.token},payload:{name:"Ali",phone:"+905551112233"}});expect(c.statusCode).toBe(201);const u=await x.app.inject({method:"PATCH",url:"/customers/"+c.json().id,headers:{cookie:"admin_session="+x.token},payload:{address:"Adana"}});expect(u.statusCode).toBe(200);expect(u.json().address).toBe("Adana");await x.app.close();});
});
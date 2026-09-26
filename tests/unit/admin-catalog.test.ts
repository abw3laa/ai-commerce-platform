/* eslint-disable @typescript-eslint/no-explicit-any */
import {describe,it,expect} from "vitest";
import Fastify from "fastify";
import {Readable} from "node:stream";
import {adminCatalogRoutes} from "../../src/routes/admin-catalog.js";
import {createFakeAuthRepositories} from "../helpers/fake-repositories.js";
import {generateSessionToken,hashSessionToken} from "../../src/auth/session-token.js";
import type {AuthorizationRepository} from "../../src/auth/authorization-types.js";
import type {CategoryRepository} from "../../src/catalog/category-types.js";
import type {MediaRepository,MediaRecord} from "../../src/catalog/media-types.js";
import type {MediaStore} from "../../src/storage/local-media-store.js";
function categoryRepo():CategoryRepository{const rows:any[]=[];return{list:async()=>rows,create:async x=>{const r={id:"c1",...x,isActive:true,createdAt:new Date(),updatedAt:new Date()};rows.push(r);return r;},update:async()=>null};}
function mediaRepo(seed:MediaRecord[]=[]):MediaRepository{const rows:MediaRecord[]=[...seed];return{list:async(t,id)=>rows.filter(x=>x.ownerType===t&&x.ownerId===id),create:async x=>{const r={id:"m1",...x,createdAt:new Date()};rows.push(r);return r;},get:async id=>rows.find(x=>x.id===id)??null,delete:async id=>{const i=rows.findIndex(x=>x.id===id);return i<0?null:rows.splice(i,1)[0]??null;}};}
function store():MediaStore{const data=new Map<string,Buffer>();return{save:async({stream,extension})=>{const b=Buffer.isBuffer(stream)?stream:Buffer.concat((await (async()=>{const chunks:Buffer[]=[];for await(const c of stream as any)chunks.push(Buffer.from(c));return chunks;})()));data.set("k."+extension,b);return{key:"k."+extension,sizeBytes:b.length};},open:key=>Readable.from(data.get(key)??Buffer.alloc(0)),remove:async key=>{data.delete(key);},size:async key=>data.get(key)?.length??0};}
async function setup(perms=["products"],seed:MediaRecord[]=[]){const app=Fastify();const auth=createFakeAuthRepositories([{id:"a1",email:"a@x.test",passwordHash:"x",isActive:true}]);const token=generateSessionToken();await auth.adminSessionRepo.create({adminUserId:"a1",tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+60000)});const authorizationRepo:AuthorizationRepository={getPermissionKeysForAdmin:async()=>perms as never};await app.addContentTypeParser("application/octet-stream",{parseAs:"buffer"},(_req,body,done)=>done(null,body));await app.register(adminCatalogRoutes,{deps:auth,authorizationRepo,categoryRepo:categoryRepo(),mediaRepo:mediaRepo(seed),mediaStore:store(),isProduction:false});return{app,token};}
describe("admin catalog",()=>{it("creates categories and validates slug",async()=>{const x=await setup();const h={cookie:"admin_session="+x.token};expect((await x.app.inject({method:"POST",url:"/categories",headers:h,payload:{name:"Men",slug:"men"}})).statusCode).toBe(201);expect((await x.app.inject({method:"POST",url:"/categories",headers:h,payload:{name:"Bad",slug:"Bad Slug"}})).statusCode).toBe(400);await x.app.close();});it("uploads supported image media",async()=>{const x=await setup();const r=await x.app.inject({method:"POST",url:"/products/p1/media?contentType=image/png&filename=shirt.png",headers:{cookie:"admin_session="+x.token,"content-type":"application/octet-stream"},payload:Buffer.from([137,80,78,71])});expect(r.statusCode).toBe(201);expect(JSON.parse(r.body).mimeType).toBe("image/png");await x.app.close();});it("protects payment receipt media with the payments permission",async()=>{
 const receipt:MediaRecord={id:"receipt-1",ownerType:"payment_receipt",ownerId:"pay-1",kind:"image",originalName:"receipt.png",mimeType:"image/png",storageKey:"receipt.png",sizeBytes:4,ocrText:"receipt",createdAt:new Date()};
 const products=await setup(["products"],[receipt]);
 const denied=await products.app.inject({method:"GET",url:"/media/receipt-1",headers:{cookie:"admin_session="+products.token}});
 expect(denied.statusCode).toBe(403);
 await products.app.close();

 const payments=await setup(["payments"],[receipt]);
 const allowed=await payments.app.inject({method:"GET",url:"/media/receipt-1",headers:{cookie:"admin_session="+payments.token}});
 expect(allowed.statusCode).toBe(200);
 await payments.app.close();
});
it("rejects unsupported media",async()=>{const x=await setup();const r=await x.app.inject({method:"POST",url:"/products/p1/media?contentType=text/plain&filename=x.txt",headers:{cookie:"admin_session="+x.token,"content-type":"application/octet-stream"},payload:"hello"});expect(r.statusCode).toBe(415);await x.app.close();});});

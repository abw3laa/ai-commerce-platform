import type { PrismaClient } from "../../generated/prisma/client.js";
import type { CategoryRepository, CategoryRecord } from "./category-types.js";
function map(row:any):CategoryRecord{return {id:row.id,name:row.name,slug:row.slug,isActive:row.isActive,createdAt:row.createdAt,updatedAt:row.updatedAt};}
function code(e:unknown){return typeof e==="object"&&e!==null&&"code" in e&&typeof e.code==="string"?e.code:undefined;}
export function createPrismaCategoryRepository(prisma:PrismaClient):CategoryRepository{return{
 async list(){return (await prisma.category.findMany({orderBy:{name:"asc"}})).map(map);},
 async create(input){try{return map(await prisma.category.create({data:{name:input.name,slug:input.slug,isActive:true}}));}catch(e){if(code(e)==="P2002")throw new Error("category_conflict",{cause:e});throw e;}},
 async update(id,input){try{return map(await prisma.category.update({where:{id},data:input}));}catch(e){if(code(e)==="P2025")return null;if(code(e)==="P2002")throw new Error("category_conflict",{cause:e});throw e;}}
};}

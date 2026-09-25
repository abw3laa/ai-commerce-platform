/* eslint-disable @typescript-eslint/no-explicit-any */
import type {PrismaClient} from "../../generated/prisma/client.js";import type {KnowledgeRepository,KnowledgeArticle} from "./types.js";
const map=(x:any):KnowledgeArticle=>({id:x.id,title:x.title,content:x.content,tags:x.tags,isActive:x.isActive,createdAt:x.createdAt,updatedAt:x.updatedAt});
export function createPrismaKnowledgeRepository(prisma:PrismaClient):KnowledgeRepository{return{
 async list(activeOnly=true){if(activeOnly)return (await prisma.knowledgeArticle.findMany({where:{isActive:true},orderBy:{updatedAt:"desc"}})).map(map);return (await prisma.knowledgeArticle.findMany({orderBy:{updatedAt:"desc"}})).map(map);},
 async search(query,limit){const q=query.trim();if(!q)return[];return (await prisma.knowledgeArticle.findMany({where:{isActive:true,OR:[{title:{contains:q,mode:"insensitive"}},{content:{contains:q,mode:"insensitive"}}]},orderBy:{updatedAt:"desc"},take:Math.min(Math.max(limit,1),20)})).map(map);},
 async create(input){return map(await prisma.knowledgeArticle.create({data:{title:input.title,content:input.content,tags:input.tags??[]}}));},
 async update(id,input){try{return map(await prisma.knowledgeArticle.update({where:{id},data:input}));}catch(e){if(typeof e==="object"&&e!==null&&"code" in e&&e.code==="P2025")return null;throw e;}},
 async delete(id){const r=await prisma.knowledgeArticle.deleteMany({where:{id}});return r.count===1;}
};}

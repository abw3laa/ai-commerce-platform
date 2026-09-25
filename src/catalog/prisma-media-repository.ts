/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { MediaRecord, MediaRepository } from "./media-types.js";
function map(row:any):MediaRecord{return {id:row.id,ownerType:row.ownerType,ownerId:row.ownerId,kind:row.kind,originalName:row.originalName,mimeType:row.mimeType,storageKey:row.storageKey,sizeBytes:row.sizeBytes,ocrText:row.ocrText??null,createdAt:row.createdAt};}
export function createPrismaMediaRepository(prisma:PrismaClient):MediaRepository{return{
 async list(ownerType,ownerId){return (await prisma.mediaAsset.findMany({where:{ownerType,ownerId},orderBy:{createdAt:"desc"}})).map(map);},
 async create(input){return map(await prisma.mediaAsset.create({data:input}));},
 async get(id){const row=await prisma.mediaAsset.findUnique({where:{id}});return row?map(row):null;},
 async delete(id){try{return map(await prisma.mediaAsset.delete({where:{id}}));}catch(e){if(typeof e==="object"&&e!==null&&"code" in e&&e.code==="P2025")return null;throw e;}}
};}

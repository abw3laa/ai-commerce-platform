/* eslint-disable @typescript-eslint/no-explicit-any */
import type {PrismaClient} from "../../generated/prisma/client.js";
import type {ConversationRepository,ConversationRecord,ConversationMessageRecord,ConversationChannel} from "./types.js";
const map=(x:any):ConversationRecord=>({id:x.id,customerId:x.customerId,channel:x.channel,externalId:x.externalId,status:x.status,assignedAdminUserId:x.assignedAdminUserId,handoffReason:x.handoffReason,summary:x.summary,summaryUpdatedAt:x.summaryUpdatedAt,lastMessageAt:x.lastMessageAt,createdAt:x.createdAt,updatedAt:x.updatedAt});
const mapMessage=(x:any):ConversationMessageRecord=>({id:x.id,conversationId:x.conversationId,externalId:x.externalId,direction:x.direction,messageType:x.messageType,body:x.body,fromAddress:x.fromAddress,toAddress:x.toAddress,createdAt:x.createdAt});
export function createPrismaConversationRepository(prisma:PrismaClient):ConversationRepository{return{
 async getOrCreate(externalId,customerId=null,channel:ConversationChannel="whatsapp"){const x=await prisma.conversation.upsert({where:{externalId},create:{externalId,customerId,channel},update:customerId?{customerId}:{}});return map(x);},
 async addMessage(i){const now=new Date();const message=await prisma.conversationMessage.create({data:{conversationId:i.conversationId,externalId:i.externalId,direction:i.direction,messageType:i.messageType??"text",body:i.body??null,fromAddress:i.fromAddress??null,toAddress:i.toAddress??null}});await prisma.conversation.update({where:{id:i.conversationId},data:{lastMessageAt:now}});return mapMessage(message);},
 async listMessages(conversationId,limit){return (await prisma.conversationMessage.findMany({where:{conversationId},orderBy:{createdAt:"desc"},take:Math.min(Math.max(limit,1),200)})).map(mapMessage);},
 async list(status){if(status){return (await prisma.conversation.findMany({where:{status},orderBy:{lastMessageAt:"desc"}})).map(map);}return (await prisma.conversation.findMany({orderBy:{lastMessageAt:"desc"}})).map(map);},
 async setStatus(id,status,assignedAdminUserId=null,handoffReason=null){try{return map(await prisma.conversation.update({where:{id},data:{status,assignedAdminUserId,handoffReason}}));}catch(e){if(typeof e==="object"&&e!==null&&"code" in e&&e.code==="P2025")return null;throw e;}},
 async setSummary(id,summary){try{return map(await prisma.conversation.update({where:{id},data:{summary,summaryUpdatedAt:summary?new Date():null}}));}catch(e){if(typeof e==="object"&&e!==null&&"code" in e&&e.code==="P2025")return null;throw e;}},
 async getContext(id,limit){const conversation=await prisma.conversation.findUnique({where:{id}});if(!conversation)return null;const messages=await this.listMessages(id,limit);return{conversation:map(conversation),messages};}
};}

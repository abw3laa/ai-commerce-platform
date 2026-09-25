import type {CommerceEngine} from "../ai/types.js";
import {buildPromptContext} from "../conversations/context.js";
import type {ConversationRepository} from "../conversations/types.js";
import type {CustomerRepository} from "../customers/types.js";
import type {ChannelConnector,NormalizedInboundMessage} from "./types.js";
export interface ChannelIngressOptions {customerRepo:CustomerRepository;conversationRepo:ConversationRepository;connector:ChannelConnector;engine:CommerceEngine;}
export function createChannelIngressHandler(o:ChannelIngressOptions){return async(message:NormalizedInboundMessage):Promise<void>=>{
 const phone=message.from.split("@")[0]??message.from;let customer=await o.customerRepo.getByPhone(phone);
 if(!customer){try{customer=await o.customerRepo.create({name:phone,phone});}catch{customer=await o.customerRepo.getByPhone(phone);}}
 const conversation=await o.conversationRepo.getOrCreate(message.externalId,customer?.id??null,message.channel);
 await o.conversationRepo.addMessage({conversationId:conversation.id,externalId:message.externalId,direction:"inbound",messageType:message.messageType??"text",body:message.body,fromAddress:message.from,toAddress:message.to});
 if(conversation.status==="human")return;if(conversation.status==="closed")await o.conversationRepo.setStatus(conversation.id,"open",null,null);
 const context=await o.conversationRepo.getContext(conversation.id,50);if(!context)throw new Error("conversation_context_unavailable");
 const compact=buildPromptContext(context);const result=await o.engine.respond({message:message.body,conversationId:conversation.id,summary:compact.summary,history:compact.messages,allowOrderCreation:false,...(customer?.id?{customerId:customer.id}:{})});
 const sent=await o.connector.sendText(message.from,result.reply);await o.conversationRepo.addMessage({conversationId:conversation.id,externalId:sent.externalId,direction:"outbound",body:result.reply,toAddress:message.from,fromAddress:message.to});
};}

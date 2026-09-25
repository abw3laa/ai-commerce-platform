export const CHANNELS=["whatsapp","messenger","facebook","instagram","tiktok"] as const;
export type ConversationChannel=(typeof CHANNELS)[number];
export type WhatsAppDirection="inbound"|"outbound";
export type ConversationStatus="open"|"human"|"closed";
export interface ConversationRecord{id:string;customerId:string|null;channel:ConversationChannel;externalId:string;status:ConversationStatus;assignedAdminUserId:string|null;handoffReason:string|null;summary:string|null;summaryUpdatedAt:Date|null;lastMessageAt:Date|null;createdAt:Date;updatedAt:Date;}
export interface ConversationMessageRecord{id:string;conversationId:string;externalId:string;direction:WhatsAppDirection;messageType:string;body:string|null;fromAddress:string|null;toAddress:string|null;createdAt:Date;}
export interface ConversationContext{conversation:ConversationRecord;messages:ConversationMessageRecord[];}
export interface ConversationRepository{
 getOrCreate(externalId:string,customerId?:string|null,channel?:ConversationChannel):Promise<ConversationRecord>;
 addMessage(input:{conversationId:string;externalId:string;direction:WhatsAppDirection;messageType?:string;body?:string|null;fromAddress?:string|null;toAddress?:string|null}):Promise<ConversationMessageRecord>;
 listMessages(conversationId:string,limit:number):Promise<ConversationMessageRecord[]>;
 list(status?:ConversationStatus):Promise<ConversationRecord[]>;
 setStatus(id:string,status:ConversationStatus,assignedAdminUserId?:string|null,handoffReason?:string|null):Promise<ConversationRecord|null>;
 setSummary(id:string,summary:string|null):Promise<ConversationRecord|null>;
 getContext(id:string,limit:number):Promise<ConversationContext|null>;
}

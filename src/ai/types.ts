export type AiRole="system"|"user"|"assistant"|"tool";
export interface AiMessage{role:AiRole;content:string;toolCallId?:string;toolName?:string;}
export interface AiToolCall{name:string;arguments:Record<string,unknown>;id:string;}
export interface AiCompletion{message:AiMessage;toolCalls?:AiToolCall[];}
export interface AiProvider{complete(input:{messages:AiMessage[];tools:AiToolDefinition[]}):Promise<AiCompletion>;}
export interface AiToolDefinition{name:string;description:string;inputSchema:Record<string,unknown>;execute(args:Record<string,unknown>):Promise<unknown>;}
export interface CommerceEngine{respond(input:{customerId?:string;conversationId?:string;message:string;language?:string}):Promise<{reply:string;toolCalls:string[]}>;}

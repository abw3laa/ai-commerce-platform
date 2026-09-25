export type WhatsAppStatus="disconnected"|"connecting"|"connected";
export interface WhatsAppConnection{status:WhatsAppStatus;phoneNumber:string|null;qr:string|null;qrUpdatedAt:string|null;lastError:string|null;}
export interface WhatsAppConnector{connect():Promise<void>;getConnection():WhatsAppConnection;sendText(to:string,body:string):Promise<{externalId:string}>;onText(handler:(message:{externalId:string;from:string;to:string;body:string})=>Promise<void>):Promise<void>;close():Promise<void>;}

export const CHANNELS = ["whatsapp","messenger","facebook","instagram","tiktok"] as const;
export type ChannelName=(typeof CHANNELS)[number];
export interface NormalizedInboundMessage { channel:ChannelName; externalId:string; from:string; to:string; body:string; messageType?:"text"|"image"|"video"|"audio"|"document"|"unknown"; }
export interface ChannelConnector { channel:ChannelName; sendText(to:string,body:string):Promise<{externalId:string}>; }

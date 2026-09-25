export interface OfferItemRecord { productId:string; quantity:number; }
export interface OfferRecord { id:string; name:string; code:string; description:string|null; price:number; quantity:number; isActive:boolean; startsAt:Date|null; endsAt:Date|null; items:OfferItemRecord[]; }
export interface OfferRepository {
 list():Promise<OfferRecord[]>;
 create(input:{name:string;code:string;description?:string|null;price:number;quantity:number;startsAt?:Date|null;endsAt?:Date|null;items:Array<{productId:string;quantity:number}>}):Promise<OfferRecord>;
 update(id:string,input:Partial<{name:string;code:string;description:string|null;price:number;quantity:number;isActive:boolean;startsAt:Date|null;endsAt:Date|null}>):Promise<OfferRecord|null>;
}
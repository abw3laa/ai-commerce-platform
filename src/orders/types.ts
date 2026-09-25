export const ORDER_STATUSES = ["received","review","preparing","shipped","on_the_way","cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export interface OrderItemRecord {
  id:string; productId:string; variantId:string|null; productName:string; sku:string|null; size:string|null; color:string|null;
  unitPrice:number; quantity:number;
}
export interface OrderRecord {
  id:string; orderNumber:string; customerId:string; status:OrderStatus; createdAt:Date; updatedAt:Date;
  items:OrderItemRecord[]; total:number;
}
export interface OrderRepository {
  list():Promise<OrderRecord[]>;
  create(input:{orderNumber:string;customerId:string;items:Array<{productId:string;variantId?:string|null;quantity:number}>}):Promise<OrderRecord>;
  updateStatus(id:string,status:OrderStatus):Promise<OrderRecord|null|{error:"invalid_transition"}>;
}
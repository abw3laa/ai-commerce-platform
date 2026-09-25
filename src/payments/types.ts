export const PAYMENT_METHODS=["prepaid","bank_transfer","pay_later"] as const;
export type PaymentMethod=(typeof PAYMENT_METHODS)[number];
export const PAYMENT_STATUSES=["pending","approved","rejected"] as const;
export type PaymentStatus=(typeof PAYMENT_STATUSES)[number];
export interface PaymentRecord{id:string;orderId:string;method:PaymentMethod;status:PaymentStatus;amount:number;reference:string|null;rejectionReason:string|null;verifiedAt:Date|null;createdAt:Date;updatedAt:Date;}
export interface PaymentRepository{getByOrderId(orderId:string):Promise<PaymentRecord|null>;upsert(input:{orderId:string;method:PaymentMethod;amount:number;reference?:string|null}):Promise<PaymentRecord>;setStatus(id:string,status:PaymentStatus,rejectionReason?:string|null):Promise<PaymentRecord|null|{error:"invalid_transition"}>;}
import type {CustomerRepository,CustomerRecord} from "./types.js";
export function createInMemoryCustomerRepository():CustomerRepository{
 const data:CustomerRecord[]=[];
 let seq=0;
 return {
  async list(){return [...data];},
  async getByPhone(phone){return data.find(x=>x.phone===phone)??null;},
  async create(i){if(data.some(x=>x.phone===i.phone))throw new Error("customer_phone_conflict");
   const now=new Date(),r={id:`customer-${++seq}`,name:i.name,phone:i.phone,email:i.email??null,address:i.address??null,notes:i.notes??null,createdAt:now,updatedAt:now};
   data.push(r);return r;},
  async update(id,i){const r=data.find(x=>x.id===id);if(!r)return null;
   if(i.phone!==undefined&&data.some(x=>x.id!==id&&x.phone===i.phone))throw new Error("customer_phone_conflict");
   Object.assign(r,i,{updatedAt:new Date()});return r;}
 };
}
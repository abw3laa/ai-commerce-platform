import type {PrismaClient} from "../../generated/prisma/client.js";
import type {CustomerRepository,CustomerRecord} from "./types.js";
function map(row:{id:string;name:string;phone:string;email:string|null;address:string|null;notes:string|null;createdAt:Date;updatedAt:Date}):CustomerRecord{return row;}
function code(e:unknown){return typeof e==="object"&&e!==null&&"code"in e&&typeof e.code==="string"?e.code:undefined;}
export function createPrismaCustomerRepository(prisma:PrismaClient):CustomerRepository{return{
 async list(){return prisma.customer.findMany({orderBy:{createdAt:"desc"}});},
 async create(i){try{return map(await prisma.customer.create({data:{name:i.name,phone:i.phone,email:i.email??null,address:i.address??null,notes:i.notes??null}}));}catch(e){if(code(e)==="P2002")throw new Error("customer_phone_conflict",{cause:e});throw e;}},
 async update(id,i){try{return map(await prisma.customer.update({where:{id},data:i}));}catch(e){if(code(e)==="P2025")return null;if(code(e)==="P2002")throw new Error("customer_phone_conflict",{cause:e});throw e;}}
};}
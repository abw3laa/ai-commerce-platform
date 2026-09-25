import type {FastifyInstance} from "fastify";
import type {AuthRepositories} from "../auth/types.js";
import type {AuthorizationRepository} from "../auth/authorization-types.js";
import {createAuthGuard} from "../auth/auth-guard.js";
import {createPermissionGuard} from "../auth/authorization-guard.js";
import type {ProductRepository} from "../catalog/types.js";
import type {CustomerRepository} from "../customers/types.js";
import type {OrderRepository} from "../orders/types.js";
import type {PaymentRepository} from "../payments/types.js";
import type {ShipmentRepository} from "../shipping/types.js";
export interface AdminReportsOptions { deps:AuthRepositories; authorizationRepo:AuthorizationRepository; productRepo:ProductRepository; customerRepo:CustomerRepository; orderRepo:OrderRepository; paymentRepo:PaymentRepository; shipmentRepo:ShipmentRepository; isProduction:boolean; }
export async function adminReportsRoutes(app:FastifyInstance,o:AdminReportsOptions):Promise<void>{
 const auth=createAuthGuard({...o.deps,isProduction:o.isProduction}),guard=createPermissionGuard(o.authorizationRepo,"reports");
 app.get("/reports/summary",{preHandler:[auth,guard]},async()=>{
  const [products,customers,orders]=await Promise.all([o.productRepo.list(),o.customerRepo.list(),o.orderRepo.list()]);
  const payments=await Promise.all(orders.map(x=>o.paymentRepo.getByOrderId(x.id))),shipments=await Promise.all(orders.map(x=>o.shipmentRepo.getByOrderId(x.id)));
  const ordersByStatus:Record<string,number>={},paymentByStatus:Record<string,number>={},shippingByStatus:Record<string,number>={};
  for(const x of orders)ordersByStatus[x.status]=(ordersByStatus[x.status]??0)+1;
  for(const x of payments)if(x)paymentByStatus[x.status]=(paymentByStatus[x.status]??0)+1;
  for(const x of shipments)if(x)shippingByStatus[x.status]=(shippingByStatus[x.status]??0)+1;
  const lowStock=products.flatMap(p=>p.variants.filter(v=>v.stockQuantity<=5).map(v=>({productId:p.id,productName:p.name,sku:v.sku,stockQuantity:v.stockQuantity})));
  return {generatedAt:new Date().toISOString(),products:products.length,activeProducts:products.filter(x=>x.isActive).length,customers:customers.length,orders:orders.length,revenue:orders.reduce((n,x)=>n+x.total,0),ordersByStatus,paymentByStatus,shippingByStatus,lowStock};
 });
}

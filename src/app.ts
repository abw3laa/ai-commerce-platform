/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify,{type FastifyInstance} from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import {loadEnv,type Env} from "./config/env.js";
import {healthRoutes} from "./routes/health.js";
import {adminAuthRoutes} from "./routes/admin-auth.js";
import type {AuthRepositories} from "./auth/types.js";
import type {AuthorizationRepository} from "./auth/authorization-types.js";
import {adminDashboardRoutes} from "./routes/admin-dashboard.js";
import {adminProductsRoutes} from "./routes/admin-products.js";
import {adminOffersRoutes} from "./routes/admin-offers.js";
import {adminCustomersRoutes} from "./routes/admin-customers.js";
import {adminOrdersRoutes} from "./routes/admin-orders.js";
import {adminPaymentsRoutes} from "./routes/admin-payments.js";
import {adminShippingRoutes} from "./routes/admin-shipping.js";
import {adminWhatsAppRoutes} from "./routes/admin-whatsapp.js";
import {adminAiRoutes} from "./routes/admin-ai.js";
import {adminUiRoutes} from "./routes/admin-ui.js";
import {adminReportsRoutes} from "./routes/admin-reports.js";
import {adminCatalogRoutes} from "./routes/admin-catalog.js";
export async function buildApp(env:Env=loadEnv(),deps?:AuthRepositories):Promise<FastifyInstance>{
 const app=env.NODE_ENV==="development"?Fastify({logger:{level:env.LOG_LEVEL,transport:{target:"pino-pretty",options:{colorize:true}}}}):Fastify({logger:{level:env.LOG_LEVEL}});
 app.addContentTypeParser("application/octet-stream",{parseAs:"buffer"},(_req,body,done)=>done(null,body));
 app.register(healthRoutes);
 app.addHook("onSend",async(_request,reply)=>{reply.header("x-content-type-options","nosniff");reply.header("referrer-policy","no-referrer");reply.header("x-frame-options","DENY");reply.header("permissions-policy","camera=(), microphone=(), geolocation=()");});
 let resolvedDeps:AuthRepositories;let authorizationRepo:AuthorizationRepository|undefined;let productRepo:any;let offerRepo:any;let customerRepo:any;let orderRepo:any;let paymentRepo:any;let shipmentRepo:any;let conversationRepo:any;let categoryRepo:any;let mediaRepo:any;let knowledgeRepo:any;
 if(deps){resolvedDeps=deps;}else{
  const [{createPrismaClient},{createPrismaAdminUserRepository},{createPrismaAdminSessionRepository},{createPrismaAuthorizationRepository},{createPrismaProductRepository},{createPrismaOfferRepository},{createPrismaCustomerRepository},{createPrismaOrderRepository},{createPrismaPaymentRepository},{createPrismaShipmentRepository},{createPrismaConversationRepository},{createPrismaCategoryRepository},{createPrismaMediaRepository},{createPrismaKnowledgeRepository}]=await Promise.all([import("./db/client.js"),import("./auth/prisma-admin-user-repository.js"),import("./auth/prisma-admin-session-repository.js"),import("./auth/prisma-authorization-repository.js"),import("./catalog/prisma-product-repository.js"),import("./catalog/prisma-offer-repository.js"),import("./customers/prisma-customer-repository.js"),import("./orders/prisma-order-repository.js"),import("./payments/prisma-payment-repository.js"),import("./shipping/prisma-shipment-repository.js"),import("./conversations/prisma-conversation-repository.js"),import("./catalog/prisma-category-repository.js"),import("./catalog/prisma-media-repository.js"),import("./knowledge/prisma-knowledge-repository.js")]);
  const {prisma,disconnect}=createPrismaClient(env.DATABASE_URL);
  resolvedDeps={adminUserRepo:createPrismaAdminUserRepository(prisma),adminSessionRepo:createPrismaAdminSessionRepository(prisma)};
  authorizationRepo=createPrismaAuthorizationRepository(prisma);productRepo=createPrismaProductRepository(prisma);offerRepo=createPrismaOfferRepository(prisma);customerRepo=createPrismaCustomerRepository(prisma);orderRepo=createPrismaOrderRepository(prisma);paymentRepo=createPrismaPaymentRepository(prisma);shipmentRepo=createPrismaShipmentRepository(prisma);conversationRepo=createPrismaConversationRepository(prisma);categoryRepo=createPrismaCategoryRepository(prisma);mediaRepo=createPrismaMediaRepository(prisma);knowledgeRepo=createPrismaKnowledgeRepository(prisma);
  app.get("/health/ready",async(_req,reply)=>{try{await prisma.$queryRaw`SELECT 1`;return {status:"ready",database:"ok",timestamp:new Date().toISOString()};}catch{return reply.code(503).send({status:"not_ready",database:"unavailable"});}});
  app.addHook("onClose",async()=>disconnect());
 }
 await app.register(fastifyRateLimit,{global:false});
 await app.register(adminAuthRoutes,{prefix:"/admin",deps:resolvedDeps,isProduction:env.NODE_ENV==="production"});
 if(!deps){
  if(!authorizationRepo||!productRepo||!offerRepo||!customerRepo||!orderRepo||!paymentRepo||!shipmentRepo||!conversationRepo||!categoryRepo||!mediaRepo)throw new Error("production dependencies not initialized");
  const {createLocalMediaStore}=await import("./storage/local-media-store.js");
  const mediaStore=createLocalMediaStore(env.MEDIA_STORAGE_DIR);
  await app.register(adminDashboardRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminProductsRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,productRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminOffersRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,offerRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminCatalogRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,categoryRepo,mediaRepo,mediaStore,isProduction:env.NODE_ENV==="production"});
  const {adminKnowledgeRoutes}=await import("./routes/admin-knowledge.js");await app.register(adminKnowledgeRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,knowledgeRepo,isProduction:env.NODE_ENV==="production"});
  const {createBaileysConnector}=await import("./whatsapp/baileys-connector.js");const whatsapp=createBaileysConnector({authDirectory:env.WHATSAPP_AUTH_DIR});
  await app.register(adminWhatsAppRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,conversationRepo,connector:whatsapp,isProduction:env.NODE_ENV==="production"});
  await app.register(adminCustomersRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,customerRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminPaymentsRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,paymentRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminShippingRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,shipmentRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminReportsRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,productRepo,customerRepo,orderRepo,paymentRepo,shipmentRepo,isProduction:env.NODE_ENV==="production"});
  const {createCommerceTools}=await import("./ai/tools.js");const {createCommerceEngine}=await import("./ai/engine.js");const {createOpenAiCompatibleProvider}=await import("./ai/openai-compatible-provider.js");
  const provider=env.AI_API_URL&&env.AI_API_KEY?createOpenAiCompatibleProvider({url:env.AI_API_URL,apiKey:env.AI_API_KEY,model:env.AI_MODEL}):{complete:async()=>{throw new Error("ai_provider_not_configured");}};
  const engine=createCommerceEngine(provider,({customerId,allowOrderCreation})=>createCommerceTools({products:productRepo,orders:orderRepo,payments:paymentRepo,shipping:shipmentRepo,knowledge:knowledgeRepo,customerId,canCreateOrder:allowOrderCreation===true}));
  const {createWhatsAppAiInboundHandler}=await import("./whatsapp/ai-inbound-handler.js");
  await whatsapp.onText(createWhatsAppAiInboundHandler({customerRepo,conversationRepo,connector:whatsapp,engine}));
  await whatsapp.connect();
  await app.register(adminOrdersRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,orderRepo,customerRepo,whatsapp,isProduction:env.NODE_ENV==="production"});
  await app.register(adminAiRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,engine,conversationRepo,isProduction:env.NODE_ENV==="production"});
  await app.register(adminUiRoutes,{prefix:"/admin",deps:resolvedDeps,authorizationRepo,isProduction:env.NODE_ENV==="production"});
 }
 return app;
}

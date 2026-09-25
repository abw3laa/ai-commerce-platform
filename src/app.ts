import Fastify, { type FastifyInstance } from "fastify";
import fastifyRateLimit from "@fastify/rate-limit";
import { loadEnv, type Env } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";
import { adminAuthRoutes } from "./routes/admin-auth.js";
import type { AuthRepositories } from "./auth/types.js";
import type { AuthorizationRepository } from "./auth/authorization-types.js";
import { adminDashboardRoutes } from "./routes/admin-dashboard.js";
import { adminProductsRoutes } from "./routes/admin-products.js";
import { adminOffersRoutes } from "./routes/admin-offers.js";
import { adminCustomersRoutes } from "./routes/admin-customers.js";
import { adminOrdersRoutes } from "./routes/admin-orders.js";
import { adminPaymentsRoutes } from "./routes/admin-payments.js";
import { adminShippingRoutes } from "./routes/admin-shipping.js";
import { adminWhatsAppRoutes } from "./routes/admin-whatsapp.js";
import { adminAiRoutes } from "./routes/admin-ai.js";
import { adminUiRoutes } from "./routes/admin-ui.js";

/**
 * Builds (but does not start listening) a Fastify instance. Async because
 * the real Prisma wiring below is imported dynamically, not statically —
 * see the comment further down for why that matters.
 *
 * Passing `deps` swaps in fake, in-memory repositories instead of the
 * real Prisma-backed ones. This is what lets almost all of the admin auth
 * routes/middleware be tested with `app.inject(...)` and no real database
 * at all: production and the real end-to-end tests both call
 * `buildApp(env)` with no second argument; every other test passes fakes.
 */
export async function buildApp(
  env: Env = loadEnv(),
  deps?: AuthRepositories,
): Promise<FastifyInstance> {
  const app =
    env.NODE_ENV === "development"
      ? Fastify({
          logger: {
            level: env.LOG_LEVEL,
            transport: { target: "pino-pretty", options: { colorize: true } },
          },
        })
      : Fastify({ logger: { level: env.LOG_LEVEL } });

  app.register(healthRoutes);
  app.addHook("onSend", async (_request, reply) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-frame-options", "DENY");
    reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
  });

  let resolvedDeps: AuthRepositories;
  let authorizationRepo: AuthorizationRepository | undefined;
  let productRepo: import("./catalog/types.js").ProductRepository | undefined;
  let offerRepo: import("./catalog/offer-types.js").OfferRepository | undefined;
  let customerRepo: import("./customers/types.js").CustomerRepository | undefined;
  let orderRepo: import("./orders/types.js").OrderRepository | undefined;
  let paymentRepo: import("./payments/types.js").PaymentRepository | undefined;
  let shipmentRepo: import("./shipping/types.js").ShipmentRepository | undefined;
  let conversationRepo: import("./conversations/types.js").ConversationRepository | undefined;
  if (deps) {
    resolvedDeps = deps;
  } else {
    // Imported dynamically and only on this branch: these four modules
    // are the only ones in the whole app that touch the generated Prisma
    // client. Any test that supplies fake `deps` above never reaches this
    // branch, so it never triggers module resolution for the generated
    // client at all — which matters because this sandbox's network
    // policy blocks Prisma's engine downloads, so that generated client
    // does not exist locally (only in CI, where it is actually
    // generated). A static top-level import here would break every test
    // that imports buildApp, even ones that never use real Prisma.
    const [{ createPrismaClient }, { createPrismaAdminUserRepository }, { createPrismaAdminSessionRepository }, { createPrismaAuthorizationRepository }, { createPrismaProductRepository }, { createPrismaOfferRepository }, { createPrismaCustomerRepository }, { createPrismaOrderRepository }, { createPrismaPaymentRepository }, { createPrismaShipmentRepository }, { createPrismaConversationRepository }] =
      await Promise.all([
        import("./db/client.js"),
        import("./auth/prisma-admin-user-repository.js"),
        import("./auth/prisma-admin-session-repository.js"),
        import("./auth/prisma-authorization-repository.js"),
        import("./catalog/prisma-product-repository.js"),
        import("./catalog/prisma-offer-repository.js"),
        import("./customers/prisma-customer-repository.js"),
        import("./orders/prisma-order-repository.js"),
        import("./payments/prisma-payment-repository.js"),
        import("./shipping/prisma-shipment-repository.js"),
        import("./conversations/prisma-conversation-repository.js"),
      ]);

    const { prisma, disconnect } = createPrismaClient(env.DATABASE_URL);
    resolvedDeps = {
      adminUserRepo: createPrismaAdminUserRepository(prisma),
      adminSessionRepo: createPrismaAdminSessionRepository(prisma),
    };
    authorizationRepo = createPrismaAuthorizationRepository(prisma);
    productRepo = createPrismaProductRepository(prisma);
    offerRepo = createPrismaOfferRepository(prisma);
    customerRepo = createPrismaCustomerRepository(prisma);
    orderRepo = createPrismaOrderRepository(prisma);
    paymentRepo = createPrismaPaymentRepository(prisma);
    shipmentRepo = createPrismaShipmentRepository(prisma);
    conversationRepo = createPrismaConversationRepository(prisma);
    app.addHook("onClose", async () => {
      await disconnect();
    });
  }

  // global: false — rate limiting only applies where a route opts in via
  // its own `config.rateLimit` (currently just POST /admin/login).
  await app.register(fastifyRateLimit, { global: false });
  await app.register(adminAuthRoutes, {
    prefix: "/admin",
    deps: resolvedDeps,
    isProduction: env.NODE_ENV === "production",
  });

  if (!deps) {
    if (!authorizationRepo) {
      throw new Error("Authorization repository was not initialized");
    }

    await app.register(adminDashboardRoutes, {
      prefix: "/admin",
      deps: resolvedDeps,
      authorizationRepo,
      isProduction: env.NODE_ENV === "production",
    });

    if (!productRepo) {
      throw new Error("Product repository was not initialized");
    }
    await app.register(adminProductsRoutes, {
      prefix: "/admin",
      deps: resolvedDeps,
      authorizationRepo,
      productRepo,
      isProduction: env.NODE_ENV === "production",
    });
    if (!offerRepo) {
      throw new Error("Offer repository was not initialized");
    }
    await app.register(adminOffersRoutes, {
      prefix: "/admin",
      deps: resolvedDeps,
      authorizationRepo,
      offerRepo,
      isProduction: env.NODE_ENV === "production",
    });
    if (!customerRepo) throw new Error("Customer repository was not initialized");
    await app.register(adminCustomersRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,customerRepo,isProduction:env.NODE_ENV==="production"});
    if (!orderRepo) throw new Error("Order repository was not initialized");
    await app.register(adminOrdersRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,orderRepo,isProduction:env.NODE_ENV==="production"});
    if (!paymentRepo) throw new Error("Payment repository was not initialized");
    await app.register(adminPaymentsRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,paymentRepo,isProduction:env.NODE_ENV==="production"});
    if (!shipmentRepo) throw new Error("Shipment repository was not initialized");
    await app.register(adminShippingRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,shipmentRepo,isProduction:env.NODE_ENV==="production"});
    if (!conversationRepo) throw new Error("Conversation repository was not initialized");
    const { createBaileysConnector } = await import("./whatsapp/baileys-connector.js");
    const whatsapp = createBaileysConnector({authDirectory:env.WHATSAPP_AUTH_DIR});
    await app.register(adminWhatsAppRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,conversationRepo,connector:whatsapp,isProduction:env.NODE_ENV==="production"});
    if (!customerRepo) throw new Error("Customer repository was not initialized");
    const customerRepository = customerRepo;
    const conversationRepository = conversationRepo;
    await whatsapp.onText(async (message) => {
      const from = message.from;
      const to = message.to;
      const externalId = message.externalId;
      const body = message.body;
      const phone = from.split("@")[0] ?? from;
      let customer = await customerRepository.getByPhone(phone);
      if (!customer) {
        try {
          customer = await customerRepository.create({name:phone,phone});
        } catch {
          customer = await customerRepository.getByPhone(phone);
        }
      }
      const customerId = customer ? customer.id : null;
      const conversation = await conversationRepository.getOrCreate(from, customerId);
      await conversationRepository.addMessage({conversationId:conversation.id,externalId,direction:"inbound",body,fromAddress:from,toAddress:to});
    });
    await whatsapp.connect();

    if (!productRepo || !orderRepo || !paymentRepo || !shipmentRepo || !authorizationRepo) throw new Error("AI dependencies were not initialized");
    const { createCommerceTools } = await import("./ai/tools.js");
    const { createCommerceEngine } = await import("./ai/engine.js");
    const { createOpenAiCompatibleProvider } = await import("./ai/openai-compatible-provider.js");
    const provider = env.AI_API_URL && env.AI_API_KEY
      ? createOpenAiCompatibleProvider({url:env.AI_API_URL,apiKey:env.AI_API_KEY,model:env.AI_MODEL})
      : { complete: async () => { throw new Error("ai_provider_not_configured"); } };
    const engine = createCommerceEngine(provider, createCommerceTools({products:productRepo,orders:orderRepo,payments:paymentRepo,shipping:shipmentRepo}));
    await app.register(adminAiRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,engine,isProduction:env.NODE_ENV==="production"});
    await app.register(adminUiRoutes, {prefix:"/admin",deps:resolvedDeps,authorizationRepo,isProduction:env.NODE_ENV==="production"});
  }

  return app;
}

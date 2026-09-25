export function isExplicitOrderConfirmation(message: string): boolean {
  const normalized = message.trim().toLocaleLowerCase();
  if (!normalized || normalized.length > 120) return false;
  return /^(نعم|اي|إي|ايوه|أيوه|تمام|موافق|موافقة|أكد|اكيد|أكيد|نعم أكد|نعم اكد|yes|yeah|yep|ok|okay|confirm|confirmed|approve|evet|tamam|onaylıyorum|onayliyorum|onay|peki)$/.test(normalized);
}

import type { CommerceEngine } from "../ai/types.js";
import { buildPromptContext } from "../conversations/context.js";
import type { ConversationRepository } from "../conversations/types.js";
import type { CustomerRepository } from "../customers/types.js";
import type { WhatsAppConnector } from "./types.js";

export interface WhatsAppAiInboundHandlerOptions {
  customerRepo: CustomerRepository;
  conversationRepo: ConversationRepository;
  connector: WhatsAppConnector;
  engine: CommerceEngine;
}

export function createWhatsAppAiInboundHandler(o: WhatsAppAiInboundHandlerOptions) {
  return async (message: {
    externalId: string;
    from: string;
    to: string;
    body: string;
  }): Promise<void> => {
    const phone = message.from.split("@")[0] ?? message.from;
    let customer = await o.customerRepo.getByPhone(phone);
    if (!customer) {
      try {
        customer = await o.customerRepo.create({ name: phone, phone });
      } catch {
        customer = await o.customerRepo.getByPhone(phone);
      }
    }

    const conversation = await o.conversationRepo.getOrCreate(
      message.from,
      customer?.id ?? null,
    );

    await o.conversationRepo.addMessage({
      conversationId: conversation.id,
      externalId: message.externalId,
      direction: "inbound",
      body: message.body,
      fromAddress: message.from,
      toAddress: message.to,
    });

    if (conversation.status === "human") return;

    if (conversation.status === "closed") {
      await o.conversationRepo.setStatus(conversation.id, "open", null, null);
    }

    const context = await o.conversationRepo.getContext(conversation.id, 50);
    if (!context) throw new Error("conversation_context_unavailable");

    const compact = buildPromptContext(context);
    const aiHistory = compact.messages.length > 0 && compact.messages.at(-1)?.role === "user" && compact.messages.at(-1)?.content.trim() === message.body.trim() ? compact.messages.slice(0, -1) : compact.messages;
    const input = {
      message: message.body,
      conversationId: conversation.id,
      summary: compact.summary,
      history: aiHistory,
      allowOrderCreation: isExplicitOrderConfirmation(message.body),
      ...(customer?.id ? { customerId: customer.id } : {}),
    };
    const result = await o.engine.respond(input);

    const sent = await o.connector.sendText(message.from, result.reply);
    await o.conversationRepo.addMessage({
      conversationId: conversation.id,
      externalId: sent.externalId,
      direction: "outbound",
      body: result.reply,
      toAddress: message.from,
      fromAddress: message.to,
    });
  };
}

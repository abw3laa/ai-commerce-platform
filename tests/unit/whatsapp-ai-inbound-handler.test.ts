import { describe, expect, it, vi } from "vitest";
import { createWhatsAppAiInboundHandler } from "../../src/whatsapp/ai-inbound-handler.js";

const date = new Date("2026-01-01T00:00:00.000Z");

function conversation(status:"open"|"human"|"closed"="open") {
  return {
    id:"conv-1", customerId:"cust-1", channel:"whatsapp" as const,
    externalId:"jid-1", status, assignedAdminUserId:null, handoffReason:null,
    summary:null, summaryUpdatedAt:null, lastMessageAt:date, createdAt:date, updatedAt:date,
  };
}

describe("WhatsApp AI inbound handler", () => {
  it("persists inbound, calls the AI with bounded context, sends the reply, and persists outbound", async () => {
    const calls: string[] = [];
    const customerRepo = {
      list: vi.fn(async()=>[]),
      getByPhone: vi.fn(async()=>({id:"cust-1",name:"Customer",phone:"90555",email:null,address:null,notes:null,createdAt:date,updatedAt:date})),
      create: vi.fn(),
      update: vi.fn(),
    };
    const conversationRepo = {
      getOrCreate: vi.fn(async()=>conversation("open")),
      addMessage: vi.fn(async(input)=>{ calls.push(input.direction); return {...conversationMessage(input), id:"m-"+calls.length}; }),
      listMessages: vi.fn(async()=>[]),
      list: vi.fn(async()=>[]),
      setStatus: vi.fn(),
      setSummary: vi.fn(),
      getContext: vi.fn(async()=>({conversation:conversation("open"),messages:[
        {...conversationMessage({direction:"inbound",body:"مرحبا"}),id:"m-old"},
      ]})),
    };
    const connector = {
      connect: vi.fn(), getConnection: vi.fn(), sendText: vi.fn(async()=>({externalId:"out-1"})),
      onText: vi.fn(), close: vi.fn(),
    };
    const engine = { respond: vi.fn(async(input)=> {
      expect(input.allowOrderCreation).toBe(false);
      expect(input.customerId).toBe("cust-1");
      expect(input.history?.length).toBe(1);
      return {reply:"أهلاً بك",toolCalls:[]};
    })};

    const handler = createWhatsAppAiInboundHandler({
      customerRepo, conversationRepo, connector, engine,
    });

    await handler({externalId:"in-1",from:"90555@s.whatsapp.net",to:"store@s.whatsapp.net",body:"مرحبا"});

    expect(conversationRepo.addMessage).toHaveBeenCalledTimes(2);
    expect(calls).toEqual(["inbound","outbound"]);
    expect(engine.respond).toHaveBeenCalledTimes(1);
    expect(connector.sendText).toHaveBeenCalledWith("90555@s.whatsapp.net","أهلاً بك");
  });

  it("does not invoke AI while a conversation is assigned to a human", async () => {
    const conversationRepo = {
      getOrCreate: vi.fn(async()=>conversation("human")),
      addMessage: vi.fn(async(input)=>conversationMessage(input)),
      listMessages: vi.fn(async()=>[]), list: vi.fn(async()=>[]), setStatus: vi.fn(),
      setSummary: vi.fn(), getContext: vi.fn(),
    };
    const customerRepo = {list:vi.fn(async()=>[]),getByPhone:vi.fn(async()=>null),create:vi.fn(),update:vi.fn()};
    const connector = {connect:vi.fn(),getConnection:vi.fn(),sendText:vi.fn(),onText:vi.fn(),close:vi.fn()};
    const engine = {respond:vi.fn()};
    const handler=createWhatsAppAiInboundHandler({customerRepo,conversationRepo,connector,engine});
    await handler({externalId:"in-2",from:"90555@s.whatsapp.net",to:"store@s.whatsapp.net",body:"أريد موظف"});
    expect(conversationRepo.addMessage).toHaveBeenCalledTimes(1);
    expect(engine.respond).not.toHaveBeenCalled();
    expect(connector.sendText).not.toHaveBeenCalled();
  });

  it("reopens a closed conversation before continuing with AI", async () => {
    const conversationRepo = {
      getOrCreate: vi.fn(async()=>conversation("closed")),
      addMessage: vi.fn(async(input)=>conversationMessage(input)),
      listMessages: vi.fn(async()=>[]), list: vi.fn(async()=>[]),
      setStatus: vi.fn(async()=>conversation("open")), setSummary: vi.fn(),
      getContext: vi.fn(async()=>({conversation:conversation("open"),messages:[]})),
    };
    const customerRepo = {list:vi.fn(async()=>[]),getByPhone:vi.fn(async()=>null),create:vi.fn(),update:vi.fn()};
    const connector = {connect:vi.fn(),getConnection:vi.fn(),sendText:vi.fn(async()=>({externalId:"out-2"})),onText:vi.fn(),close:vi.fn()};
    const engine = {respond:vi.fn(async()=>({reply:"تم",toolCalls:[]}))};
    const handler=createWhatsAppAiInboundHandler({customerRepo,conversationRepo,connector,engine});
    await handler({externalId:"in-3",from:"90555@s.whatsapp.net",to:"store@s.whatsapp.net",body:"مرحبا"});
    expect(conversationRepo.setStatus).toHaveBeenCalledWith("conv-1","open",null,null);
    expect(engine.respond).toHaveBeenCalledTimes(1);
  });
});

function conversationMessage(input:{direction:"inbound"|"outbound";body?:string|null}) {
  return {
    id:"m",conversationId:"conv-1",externalId:"ext-"+Math.random(),direction:input.direction,
    messageType:"text",body:input.body??null,fromAddress:null,toAddress:null,
    createdAt:date,
  };
}

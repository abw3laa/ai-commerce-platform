import {describe,expect,it} from "vitest";
import {isExplicitOrderConfirmation} from "../../src/whatsapp/ai-inbound-handler.js";
describe("explicit order confirmation",()=>{
 it("accepts exact short confirmations",()=>{expect(isExplicitOrderConfirmation("نعم")).toBe(true);expect(isExplicitOrderConfirmation("أكيد")).toBe(true);expect(isExplicitOrderConfirmation("yes")).toBe(true);expect(isExplicitOrderConfirmation("onaylıyorum")).toBe(true);});
 it("rejects arbitrary text",()=>{expect(isExplicitOrderConfirmation("نعم أريد اللون الأسود والمقاس L")).toBe(false);expect(isExplicitOrderConfirmation("ok send me details")).toBe(false);expect(isExplicitOrderConfirmation("")).toBe(false);});
});
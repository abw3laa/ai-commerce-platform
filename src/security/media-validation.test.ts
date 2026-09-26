import {describe,it,expect} from "vitest";
import {validateMediaSignature,mediaExtension} from "./media-validation.js";
describe("media signature validation",()=>{
 it("accepts matching image signatures",()=>{
  expect(validateMediaSignature("image/jpeg",Buffer.from([0xff,0xd8,0xff,0x00]))).toBe(true);
  expect(validateMediaSignature("image/png",Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).toBe(true);
  expect(validateMediaSignature("image/webp",Buffer.from("RIFF0000WEBP"))).toBe(true);
 });
 it("rejects MIME spoofing",()=>{
  expect(validateMediaSignature("image/png",Buffer.from("not-a-png"))).toBe(false);
  expect(validateMediaSignature("image/jpeg",Buffer.from("GIF89a"))).toBe(false);
  expect(mediaExtension("video/mp4")).toBe("mp4");
 });
});

import {mkdtemp,rm,writeFile,readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const execFileAsync=promisify(execFile);
export interface ReceiptOcr{extract(input:{buffer:Buffer;extension:string;language?:string}):Promise<string>;}
export function createTesseractReceiptOcr():ReceiptOcr{return{async extract(input){const dir=await mkdtemp(join(tmpdir(),"ai-commerce-ocr-"));const image=join(dir,"receipt."+input.extension);const output=join(dir,"result");try{await writeFile(image,input.buffer);await execFileAsync("tesseract",[image,output,"-l",input.language??"ara+eng+tur","--psm","6"],{timeout:30000,maxBuffer:1024*1024});return (await readFile(output+".txt","utf8")).trim().slice(0,20000);}catch(e){const error=e instanceof Error?e.message:"ocr_failed";throw new Error("receipt_ocr_failed",{cause:new Error(error)});}finally{await rm(dir,{recursive:true,force:true});}}};}

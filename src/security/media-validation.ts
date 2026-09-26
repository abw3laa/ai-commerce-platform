const SIGNATURES:{mime:string;extension:string;matches:(buffer:Buffer)=>boolean}[]=[
 {mime:"image/jpeg",extension:"jpg",matches:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
 {mime:"image/png",extension:"png",matches:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))},
 {mime:"image/webp",extension:"webp",matches:b=>b.length>=12&&b.subarray(0,4).toString("ascii")==="RIFF"&&b.subarray(8,12).toString("ascii")==="WEBP"},
 {mime:"image/gif",extension:"gif",matches:b=>b.length>=6&&(b.subarray(0,6).toString("ascii")==="GIF87a"||b.subarray(0,6).toString("ascii")==="GIF89a")},
 {mime:"video/mp4",extension:"mp4",matches:b=>b.length>=12&&b.subarray(4,8).toString("ascii")==="ftyp"},
 {mime:"video/webm",extension:"webm",matches:b=>b.length>=4&&b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))},
];
export function validateMediaSignature(mime:string,buffer:Buffer):boolean{
 const signature=SIGNATURES.find(x=>x.mime===mime);
 return !!signature&&signature.matches(buffer);
}
export function mediaExtension(mime:string):string|undefined{return SIGNATURES.find(x=>x.mime===mime)?.extension;}

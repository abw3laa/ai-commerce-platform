export type MediaOwner = "product" | "offer";
export interface MediaRecord {
  id:string; ownerType:MediaOwner; ownerId:string; kind:"image"|"video";
  originalName:string; mimeType:string; storageKey:string; sizeBytes:number; createdAt:Date;
}
export interface MediaRepository {
  list(ownerType:MediaOwner, ownerId:string):Promise<MediaRecord[]>;
  create(input:Omit<MediaRecord,"id"|"createdAt">):Promise<MediaRecord>;
  get(id:string):Promise<MediaRecord|null>;
  delete(id:string):Promise<MediaRecord|null>;
}

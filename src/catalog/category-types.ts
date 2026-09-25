export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface CategoryRepository {
  list(): Promise<CategoryRecord[]>;
  create(input: { name: string; slug: string }): Promise<CategoryRecord>;
  update(id: string, input: Partial<{name:string; slug:string; isActive:boolean}>): Promise<CategoryRecord|null>;
}

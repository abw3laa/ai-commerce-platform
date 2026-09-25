export interface CustomerRecord {
  id: string; name: string; phone: string; email: string | null; address: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface CustomerRepository {
  list(): Promise<CustomerRecord[]>;
  getByPhone(phone:string): Promise<CustomerRecord|null>;
  create(input:{name:string;phone:string;email?:string|null;address?:string|null;notes?:string|null}):Promise<CustomerRecord>;
  update(id:string,input:Partial<{name:string;phone:string;email:string|null;address:string|null;notes:string|null}>):Promise<CustomerRecord|null>;
}
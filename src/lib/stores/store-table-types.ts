export interface StoreTableRecord {
  id: string;
  storeId: string;
  name: string;
  capacity: number;
  token: string;
  kind: "TABLE" | "STAND";
  createdAt: string;
}

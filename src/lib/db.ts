import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Singleton Pool for the app process
let pool: Pool;
declare global {
  // eslint-disable-next-line no-var
  var __db_pool__: Pool | undefined;
}

if (!global.__db_pool__) {
  global.__db_pool__ = new Pool({ connectionString });
}
pool = global.__db_pool__;

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>{
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}

export function toVectorLiteral(vector: number[]): string {
  // Format: [v1, v2, ...]
  return `[${vector.join(",")}]`;
}

export default pool;



import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Singleton Pool for the app process
declare global {
  var __db_pool__: Pool | undefined;
}

if (!global.__db_pool__) {
  global.__db_pool__ = new Pool({ connectionString });
}
const pool = global.__db_pool__ as Pool;

type PgValue = string | number | boolean | null | Date | Uint8Array;
type PgValues = PgValue[];

export async function query<TRecord>(text: string, params?: ReadonlyArray<PgValue>): Promise<{ rows: TRecord[] }>{
  const res = params
    ? await pool.query(text, params as unknown as PgValues)
    : await pool.query(text);
  return { rows: res.rows as TRecord[] };
}

export function toVectorLiteral(vector: number[]): string {
  // Format: [v1, v2, ...]
  return `[${vector.join(",")}]`;
}

export default pool;



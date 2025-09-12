declare module "pg" {
  export class Pool {
    constructor(config?: unknown);
    query: (text: string, params?: ReadonlyArray<unknown>) => Promise<{ rows: unknown[] }>;
    end: () => Promise<void>;
  }
}



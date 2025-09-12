declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    EMBEDDINGS_PROVIDER?: string;
    OPENAI_API_KEY?: string;
    EMBEDDING_MODEL?: string;
    KERNEL_API_BASE_URL?: string;
    KERNEL_API_KEY?: string;
    KERNEL_APP_NAME?: string;
    APP_BASE_URL?: string;
    SITE_KEY_SIGNING_SECRET?: string;
    RATE_LIMIT_RECS_PER_MINUTE?: string;
    TOP_N_DEFAULT?: string;
  }
}



declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    OPENAI_API_KEY?: string;
    KERNEL_API_KEY?: string;
    APP_BASE_URL?: string;
    RATE_LIMIT_RECS_PER_MINUTE?: string;
    TOP_N_DEFAULT?: string;
  }
}



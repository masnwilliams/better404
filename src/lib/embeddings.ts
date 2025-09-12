import OpenAI from "openai";

const provider = "openai";
const openaiApiKey = process.env.OPENAI_API_KEY;
const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small"; // 1536 dims

let openai: OpenAI | null = null;
if (provider === "openai") {
  if (!openaiApiKey) throw new Error("OPENAI_API_KEY is required for embeddings");
  openai = new OpenAI({ apiKey: openaiApiKey });
}

export async function embedQueryText(text: string): Promise<number[]> {
  if (provider !== "openai" || !openai) throw new Error("Only OpenAI embeddings are configured");
  const output = await openai.embeddings.create({ model, input: text });
  const vector = output.data[0]?.embedding as number[] | undefined;
  if (!vector) throw new Error("Embedding creation failed");
  return vector;
}



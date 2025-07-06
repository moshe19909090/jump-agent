import { OpenAI } from "openai";
import { OpenAIEmbeddings } from "@langchain/openai";

export const openaiEmbeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

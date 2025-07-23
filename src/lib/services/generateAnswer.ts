// src/lib/services/generateAnswer.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ChatHistoryItem {
  message: string;
  response: string;
}

interface UserMemory {
  metadata?: {
    text?: string;
  };
}

/**
 * Generate an answer using Gemini based on the user's query and stored memories.
 */
export async function generateAnswer(
  query: string,
  userMemories: UserMemory[],
  chatHistory: ChatHistoryItem[] = []
): Promise<string> {
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("Invalid query: Provide a valid question.");
  }

  const historyText = chatHistory
    .map(item => `User: ${item.message}\nAI: ${item.response}`)
    .join("\n\n");

  // Use stored context if available; otherwise, it will fallback to general knowledge.
  let relevantContent = "";
  if (userMemories && userMemories.length > 0) {
    relevantContent = userMemories[0]?.metadata?.text || "";
  }

  const prompt = `
You are an AI assistant. Answer the following question based on the given context if relevant, otherwise provide an answer using your own general knowledge.
- Answer the user's question based on the chat history and provided context. Use context if it's relevant, otherwise use your own knowledge. Do not mention you're using context or history.
Instructions:
- Use the provided context if it is relevant.
- If the context is insufficient or missing, answer using your general knowledge.
- Do not mention whether you're using stored context or not.
- Keep your answer short and clear.
- Avoid phrases like "Based on the context provided".

User's Question: "${query}"

Chat History:
${historyText || "[No previous chat history]"}

Stored Information:
${relevantContent || "[No relevant stored information available]"}

Current Question: "${query}"
  `;

  console.log("Constructed prompt:", prompt);

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);

  const answer =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm sorry, but I couldn't generate an answer.";

  return answer;
}

export default generateAnswer;

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
    // Build context from multiple content pieces
    relevantContent = userMemories.map((memory: any) => {
      const title = memory.title || '';
      const content = memory.content || memory.metadata?.text || '';
      const summary = memory.summary || '';
      const type = memory.type || memory.metadata?.type || '';
      
      return `[${type.toUpperCase()}] ${title}\n${summary || content.slice(0, 300)}...`;
    }).join('\n\n');
  }

  const prompt = `
You are an AI assistant with access to the user's personal knowledge base. Answer the user's question using the most relevant information from their stored content when applicable.

Instructions:
- If the stored information is relevant to the question, use it to provide a comprehensive answer
- If no relevant stored information is available, provide an answer using your general knowledge
- Be conversational and helpful
- Don't mention that you're using stored information unless it adds value
- Cite specific content types when relevant (e.g., "from your YouTube video about...", "in your document...", "from your note about...")

User's Question: "${query}"

${historyText ? `Previous Conversation:
${historyText}

` : ''}${relevantContent ? `Relevant Information from Your Knowledge Base:
${relevantContent}

` : ''}Please answer the user's question:`;

  console.log("Constructed prompt:", prompt);

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);

  const answer =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm sorry, but I couldn't generate an answer.";

  return answer;
}

export default generateAnswer;

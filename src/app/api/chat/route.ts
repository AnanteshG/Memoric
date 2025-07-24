// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateAnswer } from '@/lib/services/generateAnswer';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get chat history for a user
async function getChatHistory(userId: string, contentId: string | null, chatLimit: number = 5) {
  const chatsRef = collection(db, 'chats');
  let q = query(
    chatsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(chatLimit)
  );
  
  if (contentId) {
    q = query(
      chatsRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId),
      orderBy('createdAt', 'desc'),
      limit(chatLimit)
    );
  }
  
  const snapshot = await getDocs(q);
  const history = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      message: data.message,
      response: data.response,
      createdAt: data.createdAt && typeof data.createdAt.toDate === 'function' 
        ? data.createdAt.toDate().toISOString() 
        : data.createdAt
    };
  });
    
  return history.reverse(); // Return in chronological order
}

// Save chat turn
async function saveChatTurn(userId: string, contentId: string | null, message: string, response: string) {
  const chatsRef = collection(db, 'chats');
  await addDoc(chatsRef, {
    userId,
    contentId: contentId || undefined,
    message,
    response,
    createdAt: new Date().toISOString(),
  });
}

// Search user's content for relevant information
async function searchUserContent(userId: string, searchQuery: string) {
  const contentRef = collection(db, 'content');
  const q = query(
    contentRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const allContent = snapshot.docs.map(doc => doc.data());
  
  // Simple text-based search (in production, you'd use vector similarity)
  const queryLower = searchQuery.toLowerCase();
  const relevantContent = allContent.filter((item: any) => 
    item.title?.toLowerCase().includes(queryLower) ||
    item.content?.toLowerCase().includes(queryLower) ||
    item.summary?.toLowerCase().includes(queryLower) ||
    item.processedContent?.toLowerCase().includes(queryLower) ||
    item.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))
  );
  
  return relevantContent.slice(0, 5); // Return top 5 matches
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, contentId } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // Get chat history
    let chatHistory;
    if (contentId) {
      chatHistory = await getChatHistory(userId, contentId, 5);
    } else {
      chatHistory = await getChatHistory(userId, null, 5);
    }

    // Search user's content for relevant information
    const relevantContent = await searchUserContent(userId, message);

    // Generate answer using Gemini with user's content as context
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Build context from user's content
    let contextText = '';
    if (relevantContent.length > 0) {
      contextText = '\n\nRelevant information from your knowledge base:\n';
      relevantContent.forEach((item: any, index: number) => {
        contextText += `\n${index + 1}. ${item.title || 'Untitled'}\n`;
        contextText += `   Type: ${item.type}\n`;
        contextText += `   Content: ${item.summary || item.content || 'No content'}\n`;
        if (item.tags && item.tags.length > 0) {
          contextText += `   Tags: ${item.tags.join(', ')}\n`;
        }
      });
    }

    // Build chat history context
    let historyText = '';
    if (chatHistory.length > 0) {
      historyText = '\n\nRecent conversation:\n';
      chatHistory.forEach((turn: any) => {
        historyText += `User: ${turn.message}\n`;
        historyText += `Assistant: ${turn.response}\n\n`;
      });
    }

    const prompt = `You are Memoric, an AI assistant that helps users manage and interact with their personal knowledge base. 
    
    User's question: ${message}
    
    ${contextText}
    ${historyText}
    
    Please provide a helpful, accurate response based on the user's stored content. If you reference information from their knowledge base, mention which source you're drawing from. If no relevant information is found in their knowledge base, let them know and provide general guidance.
    
    Keep your response conversational and helpful.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    // Save the chat turn
    await saveChatTurn(userId, contentId, message, answer);

    // Update user stats (increment AI queries)
    try {
      const userStatsRef = doc(db, 'userStats', userId);
      const userStatsDoc = await getDoc(userStatsRef);
      
      let currentStats = {
        totalContent: 0,
        aiQueries: 0,
        timeSavedHours: '0.0',
        favorites: 0
      };

      if (userStatsDoc.exists()) {
        currentStats = { ...currentStats, ...userStatsDoc.data() };
      }

      // Increment AI queries and add time saved
      currentStats.aiQueries = (currentStats.aiQueries || 0) + 1;
      const currentMinutes = parseFloat(currentStats.timeSavedHours) * 60;
      currentStats.timeSavedHours = ((currentMinutes + 3.5) / 60).toFixed(1);

      await setDoc(userStatsRef, {
        ...currentStats,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (statsError) {
      console.warn('Failed to update stats:', statsError);
    }

    // Return the response with source information
    return NextResponse.json({ 
      answer,
      sources: relevantContent.map((item: any) => ({
        title: item.title || 'Untitled',
        type: item.type,
        id: item.contentId
      })),
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

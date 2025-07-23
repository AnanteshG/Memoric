// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateAnswer } from '@/lib/services/generateAnswer';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

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
  const history = snapshot.docs.map(doc => ({
    message: doc.data().message,
    response: doc.data().response
  }));
    
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
    createdAt: new Date(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, contentId } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    let chatHistory;
    if (contentId) {
      chatHistory = await getChatHistory(userId, contentId, 5);
    } else {
      chatHistory = await getChatHistory(userId, null, 5);
    }

    // For now, we'll use an empty array for user memories since we removed Pinecone
    const userMemories: Array<{ metadata?: { text?: string } }> = [];

    const answer = await generateAnswer(message, userMemories, chatHistory);

    // Save the chat turn
    await saveChatTurn(userId, contentId, message, answer);

    return NextResponse.json({ 
      answer, 
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

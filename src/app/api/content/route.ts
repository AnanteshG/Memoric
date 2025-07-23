// src/app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc } from 'firebase/firestore';

// Get all content
export async function GET() {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const content = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add new content (note, tweet, website)
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, type, url, title } = await req.json();

    if (!type || !["note", "tweet", "document", "website"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    let finalContent = content || "";

    if (type === "tweet" && url) {
      // Check for existing tweet
      const contentRef = collection(db, 'content');
      const q = query(
        contentRef,
        where('type', '==', 'tweet'),
        where('originalLink', '==', url),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        finalContent = existingDoc.data().link;
      } else {
        // For now, we'll use the URL as content - you can implement tweet fetching later
        finalContent = url;
      }
    }

    if (type === "website" && !finalContent.trim() && url) {
      finalContent = url;
    }

    if (!finalContent.trim()) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const contentId = uuidv4();
    const extraMetadata = { 
      timestamp: new Date().toISOString(), 
      type, 
      ...(url ? { url } : {}) 
    };

    // Store in Firebase
    const contentRef = collection(db, 'content');
    const docRef = await addDoc(contentRef, {
      title: title || "",
      content: finalContent,
      originalLink: type === "tweet" ? url : "",
      type,
      userId,
      contentId,
      timestamp: extraMetadata.timestamp,
      createdAt: new Date(),
    });

    return NextResponse.json({ 
      message: "Content stored successfully", 
      id: docRef.id,
      contentId 
    }, { status: 201 });
  } catch (error) {
    console.error('Content creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete content
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await req.json();
    
    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }

    // Find and delete the content document
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('contentId', '==', contentId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return NextResponse.json({ 
        error: "Content not found or already deleted" 
      }, { status: 404 });
    }

    // Delete the document
    const docToDelete = snapshot.docs[0];
    await deleteDoc(docToDelete.ref);
    
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error('Content deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

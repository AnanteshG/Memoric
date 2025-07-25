import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

// Delete content by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentId = params.id;

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    // Find the content document to delete
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('contentId', '==', contentId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        error: "Content not found or you don't have permission to delete it" 
      }, { status: 404 });
    }

    // Delete the document
    const docToDelete = snapshot.docs[0];
    await deleteDoc(docToDelete.ref);
    
    return NextResponse.json({ 
      success: true, 
      message: "Content deleted successfully" 
    });

  } catch (error) {
    console.error('Content deletion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

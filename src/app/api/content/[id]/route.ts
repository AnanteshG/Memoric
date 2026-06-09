import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/supabase/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

// Delete content by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const contentId = resolvedParams.id;

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    // Get the document directly by ID
    const contentDocRef = doc(db, 'content', contentId);
    const contentDoc = await getDoc(contentDocRef);
    
    if (!contentDoc.exists()) {
      return NextResponse.json({ 
        error: "Content not found" 
      }, { status: 404 });
    }

    // Check if the user owns this content
    const contentData = contentDoc.data();
    if (contentData.userId !== userId) {
      return NextResponse.json({ 
        error: "You don't have permission to delete this content" 
      }, { status: 403 });
    }

    // Delete the document
    await deleteDoc(contentDocRef);
    
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

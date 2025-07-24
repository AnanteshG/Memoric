// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get content count
    const contentRef = collection(db, 'content');
    const contentQuery = query(contentRef, where('userId', '==', userId));
    const contentSnapshot = await getDocs(contentQuery);
    const totalContent = contentSnapshot.size;

    // Get favorites count (content with favorite flag)
    const favoriteContent = contentSnapshot.docs.filter(doc => doc.data().isFavorite === true);
    const favoritesCount = favoriteContent.length;

    // Get chat/AI queries count
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('userId', '==', userId));
    const chatsSnapshot = await getDocs(chatsQuery);
    const aiQueriesCount = chatsSnapshot.size;

    // Get or calculate time saved (each content item saves approximately 5-10 minutes)
    // Each AI query saves approximately 2-5 minutes of research time
    const estimatedTimeSavedMinutes = (totalContent * 7) + (aiQueriesCount * 3.5);
    const timeSavedHours = (estimatedTimeSavedMinutes / 60).toFixed(1);

    // Get user stats document to check for custom values
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsDoc = await getDoc(userStatsRef);

    let stats = {
      totalContent,
      aiQueries: aiQueriesCount,
      timeSavedHours,
      favorites: favoritesCount
    };

    // If user stats document exists, use custom values if available
    if (userStatsDoc.exists()) {
      const customStats = userStatsDoc.data();
      stats = {
        totalContent: customStats.totalContent || totalContent,
        aiQueries: customStats.aiQueries || aiQueriesCount,
        timeSavedHours: customStats.timeSavedHours || timeSavedHours,
        favorites: customStats.favorites || favoritesCount
      };
    } else {
      // Create initial stats document
      await setDoc(userStatsRef, {
        ...stats,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ 
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}

// Update user stats
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      incrementAiQueries = false,
      incrementContent = false,
      toggleFavorite = null,
      customTimeSaved = null
    } = await request.json();

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

    // Update stats based on actions
    if (incrementAiQueries) {
      currentStats.aiQueries = (currentStats.aiQueries || 0) + 1;
      // Add 3.5 minutes for each AI query
      const currentMinutes = parseFloat(currentStats.timeSavedHours) * 60;
      currentStats.timeSavedHours = ((currentMinutes + 3.5) / 60).toFixed(1);
    }

    if (incrementContent) {
      currentStats.totalContent = (currentStats.totalContent || 0) + 1;
      // Add 7 minutes for each piece of content
      const currentMinutes = parseFloat(currentStats.timeSavedHours) * 60;
      currentStats.timeSavedHours = ((currentMinutes + 7) / 60).toFixed(1);
    }

    if (toggleFavorite !== null) {
      currentStats.favorites = Math.max(0, currentStats.favorites + (toggleFavorite ? 1 : -1));
    }

    if (customTimeSaved !== null) {
      currentStats.timeSavedHours = customTimeSaved.toString();
    }

    // Update the document
    await setDoc(userStatsRef, {
      ...currentStats,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ 
      success: true,
      data: currentStats
    });
  } catch (error) {
    console.error('Update user stats error:', error);
    return NextResponse.json(
      { error: 'Failed to update user stats' },
      { status: 500 }
    );
  }
}

// src/app/api/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { processContent } from '@/lib/services/processContent';

export const dynamic = 'force-dynamic';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

// Get all content
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const contentRef = collection(db, 'content');
    let q = query(
      contentRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    let content = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert any Firestore Timestamp objects to ISO strings
      const processedData = JSON.parse(JSON.stringify(data, (key, value) => {
        // Handle Firestore Timestamp objects
        if (value && typeof value === 'object' && value.toDate) {
          return value.toDate().toISOString();
        }
        // Handle regular Date objects
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }));
      
      return {
        id: doc.id,
        ...processedData,
        // Ensure we have a createdAt field
        createdAt: processedData.timestamp || processedData.createdAt || new Date().toISOString()
      };
    });

    // Filter by type if specified
    if (type && type !== 'all') {
      content = content.filter((item: any) => item.type === type);
    }

    // Filter by search if specified
    if (search) {
      const searchLower = search.toLowerCase();
      content = content.filter((item: any) =>
        item.title?.toLowerCase().includes(searchLower) ||
        item.content?.toLowerCase().includes(searchLower) ||
        item.summary?.toLowerCase().includes(searchLower) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return NextResponse.json({ 
      success: true,
      data: content,
      total: content.length
    });
  } catch (error) {
    console.error('Get content error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add new content (note, tweet, website, document, image, youtube, reddit)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, type, url, title, metadata } = await req.json();

    if (!type || !["note", "tweet", "x", "document", "website", "image", "youtube", "reddit", "text"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    let finalContent = content || "";
    let finalTitle = title || "";
    let externalData = null;

    // Fetch external data based on type and URL
    if (url) {
      try {
        if ((type === 'tweet' || type === 'x') && (url.includes('twitter.com') || url.includes('x.com'))) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/external/x`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          if (response.ok) {
            const result = await response.json();
            externalData = result.data;
            finalContent = finalContent || externalData.text;
            
            // Generate AI title for tweet
            if (externalData.text && !finalTitle) {
              try {
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const titlePrompt = `Generate a concise, descriptive title (max 60 characters) for this tweet content: "${externalData.text.substring(0, 200)}"
                
                Return only the title, no quotes or extra text.`;
                
                const titleResult = await model.generateContent(titlePrompt);
                const aiTitle = titleResult.response.text().trim();
                finalTitle = aiTitle.length > 60 ? aiTitle.substring(0, 57) + '...' : aiTitle;
              } catch (aiError) {
                console.warn('AI title generation failed, using fallback:', aiError);
                finalTitle = externalData.text?.substring(0, 50) + '...';
              }
            }
          }
        } else if (type === 'reddit' && url.includes('reddit.com')) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/external/reddit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          if (response.ok) {
            const result = await response.json();
            externalData = result.data;
            finalTitle = finalTitle || externalData.title;
            finalContent = finalContent || externalData.selftext || externalData.title;
          }
        } else if (type === 'youtube' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/external/youtube`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          if (response.ok) {
            const result = await response.json();
            externalData = result.data;
            finalTitle = finalTitle || externalData.title;
            finalContent = finalContent || externalData.description;
          }
        }
      } catch (externalError) {
        console.warn('External API failed, proceeding with user content:', externalError);
      }
    }

    // Handle different content types
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
        return NextResponse.json({ error: "Tweet already saved" }, { status: 409 });
      }
      
      finalContent = content || finalContent || url;
      
      // Generate AI title if not already set
      if (!finalTitle && finalContent) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const titlePrompt = `Generate a concise, descriptive title (max 60 characters) for this tweet: "${finalContent.substring(0, 200)}"
          
          Return only the title, no quotes or extra text.`;
          
          const titleResult = await model.generateContent(titlePrompt);
          const aiTitle = titleResult.response.text().trim();
          finalTitle = aiTitle.length > 60 ? aiTitle.substring(0, 57) + '...' : aiTitle;
        } catch (aiError) {
          console.warn('AI title generation failed, using fallback:', aiError);
          finalTitle = finalContent.substring(0, 50) + '...';
        }
      }
      
      // Fallback title if still empty
      if (!finalTitle) {
        finalTitle = `Tweet from ${url}`;
      }
    }

    if ((type === "website" || type === "youtube" || type === "reddit") && !finalContent.trim() && url) {
      finalContent = url;
      finalTitle = title || `${type.charAt(0).toUpperCase() + type.slice(1)} content`;
    }

    if (!finalContent.trim()) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // Process content with Gemini AI
    let summary = '';
    let tags: string[] = [];
    let aiProcessedContent = finalContent;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Generate summary and tags using Gemini
      const analysisPrompt = `
        Analyze the following content and provide:
        1. A brief summary (2-3 sentences)
        2. 5 relevant tags/keywords
        3. Extract key information and insights
        
        Content Type: ${type}
        Title: ${finalTitle}
        Content: ${finalContent}
        
        Format your response as JSON:
        {
          "summary": "Brief summary here",
          "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
          "insights": "Key insights and important information extracted"
        }
      `;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        // Clean the response to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          summary = parsed.summary || finalContent.substring(0, 200) + '...';
          tags = parsed.tags || ['general'];
          aiProcessedContent = parsed.insights || finalContent;
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        // Fallback processing
        summary = finalContent.substring(0, 200) + '...';
        tags = [type, 'unprocessed'];
      }

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      // Fallback processing without AI
      summary = finalContent.substring(0, 200) + '...';
      tags = [type, 'manual'];
    }

    const contentId = uuidv4();
    const timestamp = new Date().toISOString();

    // Store in Firebase with AI-processed data and external API data
    const contentRef = collection(db, 'content');
    const docRef = await addDoc(contentRef, {
      title: finalTitle,
      content: finalContent,
      processedContent: aiProcessedContent,
      summary,
      tags,
      originalLink: url || "",
      type,
      userId,
      contentId,
      timestamp,
      metadata: metadata || {},
      externalData: externalData || null, // Store external API data
      createdAt: new Date(),
      aiProcessed: true,
      // Add specific fields for display
      thumbnail: externalData?.thumbnails?.medium?.url || externalData?.thumbnail || externalData?.preview || null,
      author: externalData?.author || externalData?.channelTitle || null,
      platform: externalData ? (type === 'tweet' || type === 'x' ? 'X' : type === 'reddit' ? 'Reddit' : type === 'youtube' ? 'YouTube' : null) : null,
      metrics: {
        likes: externalData?.like_count || externalData?.likeCount || 0,
        views: externalData?.viewCount || 0,
        comments: externalData?.num_comments || externalData?.commentCount || 0,
        score: externalData?.score || 0
      }
    });

    // TODO: Store embeddings in vector database (Pinecone, etc.)
    // const embeddings = await generateEmbeddings(aiProcessedContent);
    // await storeInVectorDB(contentId, embeddings, {title, content: aiProcessedContent, tags});

    // Update user stats (increment content count)
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

      // Increment content count and add time saved
      currentStats.totalContent = (currentStats.totalContent || 0) + 1;
      const currentMinutes = parseFloat(currentStats.timeSavedHours) * 60;
      currentStats.timeSavedHours = ((currentMinutes + 7) / 60).toFixed(1);

      await setDoc(userStatsRef, {
        ...currentStats,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (statsError) {
      console.warn('Failed to update stats:', statsError);
    }

    return NextResponse.json({ 
      success: true,
      message: "Content stored and processed successfully", 
      data: {
        id: docRef.id,
        contentId,
        title: finalTitle,
        summary,
        tags,
        type
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Content creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete content
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    
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

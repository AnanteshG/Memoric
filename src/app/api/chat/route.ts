// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/supabase/server';
import { generateAnswer } from '@/lib/services/generateAnswer';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

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
  const chatData: any = {
    userId,
    message,
    response,
    createdAt: new Date().toISOString(),
  };
  
  // Only add contentId if it's not null
  if (contentId) {
    chatData.contentId = contentId;
  }
  
  await addDoc(chatsRef, chatData);
}

// Search user's content for relevant information
async function searchUserContent(userId: string, searchQuery: string) {
  console.log('🔍 Searching content for userId:', userId, 'query:', searchQuery);
  
  const contentRef = collection(db, 'content');
  
  let snapshot;
  try {
    // Try with ordering first
    const q = query(
      contentRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    snapshot = await getDocs(q);
  } catch (error) {
    console.warn('⚠️ Ordered query failed, trying without ordering:', error);
    // Fallback to simple query without ordering
    const q = query(
      contentRef,
      where('userId', '==', userId)
    );
    snapshot = await getDocs(q);
  }
  
  const allContent = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  console.log('📚 Total content found:', allContent.length);
  console.log('📄 Sample content structure:', allContent.length > 0 ? Object.keys(allContent[0]) : 'No content');
  
  // Debug: Log the actual content of first few items
  if (allContent.length > 0) {
    allContent.slice(0, 2).forEach((item: any, index: number) => {
      console.log(`📋 Content ${index + 1}:`, {
        title: item.title,
        type: item.type,
        contentLength: item.content?.length || 0,
        contentPreview: item.content?.substring(0, 100) || 'No content',
        summaryLength: item.summary?.length || 0,
        summaryPreview: item.summary?.substring(0, 100) || 'No summary',
        processedContentLength: item.processedContent?.length || 0,
        hasExternalData: !!item.externalData,
        hasMetadata: !!item.metadata
      });
    });
  }
  
  if (allContent.length === 0) {
    console.log('❌ No content found for user');
    return [];
  }

  // Enhanced search using all possible content fields
  const queryLower = searchQuery.toLowerCase();
  const queryTerms = queryLower.split(' ').filter(term => term.length > 2); // Filter out very short terms
  
  console.log('🔍 Search terms:', queryTerms);
  
  const relevantContent = allContent.filter((item: any) => {
    // Get all possible text fields to search through
    const title = item.title?.toLowerCase() || '';
    const content = item.content?.toLowerCase() || '';
    const processedContent = item.processedContent?.toLowerCase() || '';
    const summary = item.summary?.toLowerCase() || '';
    const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
    
    // Metadata fields
    const extractedText = item.metadata?.extractedText?.toLowerCase() || '';
    const transcript = item.metadata?.transcript?.toLowerCase() || '';
    
    // External data fields
    const externalDescription = item.externalData?.description?.toLowerCase() || '';
    const externalTitle = item.externalData?.title?.toLowerCase() || '';
    const externalContent = item.externalData?.content?.toLowerCase() || '';
    
    // Original link and other fields
    const originalLink = item.originalLink?.toLowerCase() || '';
    const author = item.author?.toLowerCase() || '';
    
    // Legacy fields (in case they exist)
    const searchableText = item.searchableText?.toLowerCase() || '';
    
    // Combine all searchable text
    const allText = [
      title, content, processedContent, summary, tags,
      extractedText, transcript, externalDescription, externalTitle,
      externalContent, originalLink, author, searchableText,
      // Enhanced search fields
      item.enhancedSearchableText?.toLowerCase() || '',
      Array.isArray(item.searchKeywords) ? item.searchKeywords.join(' ').toLowerCase() : '',
      Array.isArray(item.metadata?.concepts) ? item.metadata.concepts.join(' ').toLowerCase() : '',
      item.enhancedContent?.toLowerCase() || ''
    ].join(' ');
    
    // Log what we're searching through for debugging
    console.log('🔍 Checking item:', {
      title: item.title,
      contentLength: content.length,
      summaryLength: summary.length,
      processedContentLength: processedContent.length,
      allTextLength: allText.length,
      type: item.type,
      // Show actual content preview for debugging
      contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      summaryPreview: summary.substring(0, 100) + (summary.length > 100 ? '...' : ''),
    });
    
    // Search using multiple strategies:
    // 1. Direct term matching
    let hasDirectMatch = false;
    for (const term of queryTerms) {
      if (allText.includes(term)) {
        hasDirectMatch = true;
        console.log(`✅ Direct match found for term "${term}" in item: ${item.title}`);
        break;
      }
    }
    
    // 2. Partial word matching (for cases like "anantesh" might be "Anantesh G" in the content)
    let hasPartialMatch = false;
    for (const term of queryTerms) {
      if (term.length > 3) { // Only for longer terms
        const words = allText.split(/\s+/);
        for (const word of words) {
          if (word.includes(term) || term.includes(word.substring(0, Math.min(word.length, term.length)))) {
            hasPartialMatch = true;
            console.log(`✅ Partial match found for term "${term}" with word "${word}" in item: ${item.title}`);
            break;
          }
        }
        if (hasPartialMatch) break;
      }
    }
    
    // 3. Fuzzy matching for names and important terms
    let hasFuzzyMatch = false;
    if (queryLower.includes('anantesh') || queryLower.includes('project')) {
      // Look for variations
      if (allText.includes('anantesh') || allText.includes('projects') || 
          allText.includes('project') || allText.includes('built') || 
          allText.includes('developed') || allText.includes('created')) {
        hasFuzzyMatch = true;
        console.log(`✅ Fuzzy match found in item: ${item.title}`);
      }
    }
    
    // 4. Special handling for specific content types
    let hasSpecialMatch = false;
    if (item.type === 'youtube' || item.type === 'reddit' || item.type === 'tweet') {
      // If it's media content and query mentions media-related terms
      if ((queryLower.includes('video') || queryLower.includes('watch') || queryLower.includes('youtube')) && 
          (title.includes('video') || item.type === 'youtube')) {
        hasSpecialMatch = true;
        console.log(`✅ Media type match found for YouTube: ${item.title}`);
      }
      
      // If query mentions a name and content title contains it
      if (queryLower.includes('content') && title.includes('content')) {
        hasSpecialMatch = true;
        console.log(`✅ Content name match found: ${item.title}`);
      }
    }
    
    const matches = hasDirectMatch || hasPartialMatch || hasFuzzyMatch || hasSpecialMatch;
    
    if (matches) {
      console.log('✅ Overall match found in item:', item.title || item.id);
    } else {
      console.log('❌ No match found in item:', item.title || item.id);
    }
    
    return matches;
  });
  
  console.log('🎯 Relevant content found:', relevantContent.length);
  
  // Score and sort results by relevance
  const scoredContent = relevantContent.map((item: any) => {
    let score = 0;
    const searchTerms = queryTerms; // Use the filtered terms
    
    // Combine all text for scoring
    const allText = [
      item.title?.toLowerCase() || '',
      item.content?.toLowerCase() || '',
      item.processedContent?.toLowerCase() || '',
      item.summary?.toLowerCase() || '',
      Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '',
      item.metadata?.extractedText?.toLowerCase() || '',
      item.metadata?.transcript?.toLowerCase() || '',
      item.externalData?.description?.toLowerCase() || '',
      item.externalData?.title?.toLowerCase() || '',
      item.externalData?.content?.toLowerCase() || '',
      item.originalLink?.toLowerCase() || '',
      item.author?.toLowerCase() || '',
      item.searchableText?.toLowerCase() || ''
    ].join(' ');
    
    searchTerms.forEach(term => {
      // Higher score for title matches
      if (item.title?.toLowerCase().includes(term)) score += 5;
      if (item.externalData?.title?.toLowerCase().includes(term)) score += 5;
      
      // High score for exact matches in main content
      if (item.content?.toLowerCase().includes(term)) score += 4;
      if (item.processedContent?.toLowerCase().includes(term)) score += 4;
      if (item.summary?.toLowerCase().includes(term)) score += 4;
      
      // Medium score for other content
      if (item.externalData?.description?.toLowerCase().includes(term)) score += 3;
      if (item.externalData?.content?.toLowerCase().includes(term)) score += 3;
      if (item.metadata?.extractedText?.toLowerCase().includes(term)) score += 3;
      if (item.metadata?.transcript?.toLowerCase().includes(term)) score += 3;
      
      // Lower score for tag and metadata matches
      if (item.tags?.some((tag: string) => tag.toLowerCase().includes(term))) score += 2;
      if (item.author?.toLowerCase().includes(term)) score += 2;
      
      // Bonus score for specific important terms
      if (term === 'anantesh' && allText.includes('anantesh')) score += 3;
      if ((term === 'project' || term === 'projects') && (allText.includes('project') || allText.includes('built') || allText.includes('developed'))) score += 3;
    });
    
    // Bonus for media content when asking about videos
    if (queryLower.includes('video') && item.type === 'youtube') {
      score += 5;
    }
    
    return { ...item, relevanceScore: score };
  });
  
  // Sort by relevance score and return top results
  const sortedContent = scoredContent
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10); // Increase to top 10 matches
  
  console.log('🏆 Top scored content:', sortedContent.map(item => ({ title: item.title, score: item.relevanceScore })));
  
  return sortedContent;
}

export async function POST(req: NextRequest) {
  console.log('🔥 Chat API called');
  try {
    console.log('🔐 Attempting auth...');
    const userId = await getUserId();
    console.log('✅ Auth result:', { userId });
    
    if (!userId) {
      console.log('❌ No userId found');
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
    console.log('🔍 Starting content search...');
    const relevantContent = await searchUserContent(userId, message);
    console.log('📊 Search completed. Found', relevantContent.length, 'relevant items');

    // Generate answer using Gemini with user's content as context
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Build context from user's content
    let contextText = '';
    if (relevantContent.length > 0) {
      contextText = '\n\nRelevant information from your knowledge base:\n';
      relevantContent.forEach((item: any, index: number) => {
        contextText += `\n${index + 1}. ${item.title || 'Untitled'}\n`;
        contextText += `   Type: ${item.type || 'Unknown'}\n`;
        
        // Include comprehensive content from all possible fields
        if (item.summary) {
          contextText += `   Summary: ${item.summary}\n`;
        }
        
        // For content with URLs, prioritize the content
        if (item.content) {
          contextText += `   Content: ${item.content.substring(0, 800)}${item.content.length > 800 ? '...' : ''}\n`;
        }
        
        if (item.processedContent && item.processedContent !== item.content) {
          contextText += `   Processed Content: ${item.processedContent.substring(0, 800)}${item.processedContent.length > 800 ? '...' : ''}\n`;
        }
        
        // External data content
        if (item.externalData?.description) {
          contextText += `   Description: ${item.externalData.description.substring(0, 500)}${item.externalData.description.length > 500 ? '...' : ''}\n`;
        }
        if (item.externalData?.content) {
          contextText += `   External Content: ${item.externalData.content.substring(0, 500)}${item.externalData.content.length > 500 ? '...' : ''}\n`;
        }
        
        // Metadata content
        if (item.metadata?.extractedText) {
          contextText += `   Extracted Text: ${item.metadata.extractedText.substring(0, 500)}${item.metadata.extractedText.length > 500 ? '...' : ''}\n`;
        }
        if (item.metadata?.transcript) {
          contextText += `   Transcript: ${item.metadata.transcript.substring(0, 500)}${item.metadata.transcript.length > 500 ? '...' : ''}\n`;
        }
        
        // Content-specific metadata
        if (item.metadata?.contentType) {
          contextText += `   Content Type: ${item.metadata.contentType}\n`;
        }
        if (item.metadata?.keyTopics && Array.isArray(item.metadata.keyTopics)) {
          contextText += `   Key Topics: ${item.metadata.keyTopics.join(', ')}\n`;
        }
        
        // Additional metadata
        if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
          contextText += `   Tags: ${item.tags.join(', ')}\n`;
        }
        if (item.author) {
          contextText += `   Author: ${item.author}\n`;
        }
        if (item.originalLink) {
          contextText += `   Source URL: ${item.originalLink}\n`;
        }
        if (item.platform) {
          contextText += `   Platform: ${item.platform}\n`;
        }
        contextText += '\n';
      });
    } else {
      console.log('❌ No relevant content found for query:', message);
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
    
    Instructions:
    1. ALWAYS check the provided knowledge base content above for relevant information
    2. If you find relevant information in the knowledge base, use it to answer the question and cite the specific sources
    3. If no relevant information is found in the knowledge base, clearly state this and explain what you found instead
    4. Be specific about which content sources you're referencing
    5. Provide helpful and accurate responses based on the available information
    
    ${relevantContent.length === 0 ? 
      'Note: No relevant documents were found in the knowledge base for this query. Please let the user know this and provide general guidance instead.' : 
      `Note: You have access to ${relevantContent.length} relevant document(s) from the user's knowledge base. Use this information to provide a comprehensive answer.`
    }
    
    Keep your response conversational and helpful.`;

    console.log('🤖 Sending prompt to Gemini with context length:', contextText.length);
    console.log('📝 Context preview:', contextText.substring(0, 200) + '...');

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

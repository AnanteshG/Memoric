// src/app/api/content/enhance-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/supabase/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Enhancing all content for user:', userId);

    // Get all user content
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    const allContent = snapshot.docs.map(doc => ({
      id: doc.id,
      docRef: doc.ref,
      ...doc.data()
    })) as any[];

    console.log('📚 Found', allContent.length, 'documents to enhance');

    const results = [];

    for (const item of allContent) {
      try {
        console.log('🔄 Processing:', item.title);
        
        // Check if already enhanced recently
        if (item.metadata?.enhancedAt) {
          const enhancedDate = new Date(item.metadata.enhancedAt);
          const daysSinceEnhanced = (Date.now() - enhancedDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceEnhanced < 1) {
            console.log('⏭️ Skipping recently enhanced content:', item.title);
            continue;
          }
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const contentToAnalyze = [
          item.title,
          item.content,
          item.summary,
          item.processedContent
        ].filter(Boolean).join('\n\n').substring(0, 2000);

        const prompt = `Analyze this ${item.type || 'content'} and make it more searchable:

Title: ${item.title}
Content: ${contentToAnalyze}

Provide search enhancement as JSON:
{
  "searchKeywords": ["keyword1", "keyword2", "keyword3"],
  "concepts": ["concept1", "concept2"],
  "enhancedTags": ["tag1", "tag2", "tag3"],
  "searchableText": "comprehensive searchable description including key terms, names, topics, and concepts",
  "summary": "improved summary if the current one is lacking"
}

Focus on making this content findable when users search for:
- Key people, names, places mentioned
- Main topics and concepts
- Technical terms or skills
- Actions or achievements
- Related themes or categories`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();
        
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          // Merge tags
          const existingTags = item.tags || [];
          const newTags = analysis.enhancedTags || [];
          const allTags = [...existingTags, ...newTags];
          const uniqueTags = [...new Set(allTags)].slice(0, 10); // Limit to 10 tags
          
          // Update document
          await updateDoc(item.docRef, {
            searchKeywords: analysis.searchKeywords || [],
            enhancedSearchableText: analysis.searchableText || '',
            tags: uniqueTags,
            ...(analysis.summary && (!item.summary || item.summary.length < 50) ? { summary: analysis.summary } : {}),
            metadata: {
              ...(item.metadata || {}),
              concepts: analysis.concepts || [],
              enhancedAt: new Date().toISOString(),
              searchEnhanced: true
            }
          });
          
          results.push({
            title: item.title,
            status: 'enhanced',
            addedKeywords: analysis.searchKeywords?.length || 0,
            addedTags: newTags.length
          });
          
          console.log('✅ Enhanced:', item.title);
        } else {
          results.push({
            title: item.title,
            status: 'failed_parse'
          });
        }
      } catch (error) {
        console.error('Error enhancing', item.title, ':', error);
        results.push({
          title: item.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('✅ Enhancement complete. Results:', results);

    return NextResponse.json({
      success: true,
      message: `Enhanced ${results.filter(r => r.status === 'enhanced').length} out of ${allContent.length} documents`,
      results
    });

  } catch (error) {
    console.error('Enhance all error:', error);
    return NextResponse.json({ 
      error: 'Failed to enhance content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

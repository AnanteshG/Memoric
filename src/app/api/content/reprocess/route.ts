// src/app/api/content/reprocess/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await req.json();

    if (!contentId) {
      return NextResponse.json({ error: 'Content ID required' }, { status: 400 });
    }

    console.log('🔄 Reprocessing content:', contentId);

    // Get the content document
    const contentRef = collection(db, 'content');
    const q = query(
      contentRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const contentDoc = snapshot.docs[0];
    const contentData = contentDoc.data();

    console.log('📄 Found content:', {
      title: contentData.title,
      type: contentData.type,
      hasContent: !!contentData.content,
      contentLength: contentData.content?.length || 0
    });

    // If it's a PDF document with placeholder text, try to reprocess it
    if (contentData.type === 'document' && contentData.title?.endsWith('.pdf')) {
      console.log('🔄 Reprocessing PDF document...');
      
      // Check if content looks like placeholder
      const content = contentData.content || '';
      if (content.includes('placeholder') || content.includes('PDF file processed:') || content.length < 100) {
        console.log('⚠️ Detected placeholder content, but cannot reprocess without original file');
        
        // For now, we'll enhance the existing content with AI analysis if possible
        if (contentData.summary || contentData.processedContent) {
          const textToAnalyze = contentData.processedContent || contentData.summary || contentData.title;
          
          try {
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            
            const prompt = `Based on this document title and any available information: "${contentData.title}"
            
            Available content: ${textToAnalyze}
            
            This appears to be a PDF document. Please provide:
            1. A comprehensive summary of what this document likely contains
            2. Key topics that would typically be in such a document
            3. Relevant tags for categorization
            4. Enhanced searchable content
            
            Format as JSON:
            {
              "summary": "detailed summary",
              "keyTopics": ["topic1", "topic2", "topic3"],
              "tags": ["tag1", "tag2", "tag3"],
              "enhancedContent": "searchable content description"
            }`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const analysisText = response.text();
            
            // Parse AI response
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);
              
              // Update the document with enhanced information
              await updateDoc(doc(db, 'content', contentDoc.id), {
                summary: analysis.summary || contentData.summary,
                tags: analysis.tags || contentData.tags || [],
                enhancedContent: analysis.enhancedContent,
                metadata: {
                  ...contentData.metadata,
                  keyTopics: analysis.keyTopics || [],
                  reprocessed: true,
                  reprocessedAt: new Date().toISOString()
                },
                processedContent: analysis.enhancedContent || contentData.processedContent
              });
              
              console.log('✅ Enhanced document with AI analysis');
              
              return NextResponse.json({
                success: true,
                message: 'Document enhanced with AI analysis',
                analysis
              });
            }
          } catch (aiError) {
            console.error('AI enhancement failed:', aiError);
          }
        }
        
        return NextResponse.json({
          success: false,
          message: 'PDF contains placeholder content. Original file would need to be re-uploaded for full text extraction.',
          suggestion: 'Try re-uploading the PDF file to get full content extraction.'
        });
      }
    }

    // For other content types or PDFs with good content, just enhance the searchability
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const contentToAnalyze = [
        contentData.title,
        contentData.content,
        contentData.summary,
        contentData.processedContent
      ].filter(Boolean).join('\n\n');

      const prompt = `Analyze this content and enhance its searchability:

${contentToAnalyze.substring(0, 3000)}

Provide:
1. Additional search keywords that users might use to find this content
2. Alternative phrasings and synonyms
3. Key concepts and topics
4. Enhanced tags

Format as JSON:
{
  "searchKeywords": ["keyword1", "keyword2"],
  "concepts": ["concept1", "concept2"],
  "enhancedTags": ["tag1", "tag2"],
  "searchableText": "enhanced searchable content"
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Update with enhanced searchability
        const updatedTags = [...(contentData.tags || []), ...(analysis.enhancedTags || [])];
        const uniqueTags = [...new Set(updatedTags)];
        
        await updateDoc(doc(db, 'content', contentDoc.id), {
          searchKeywords: analysis.searchKeywords || [],
          enhancedSearchableText: analysis.searchableText,
          tags: uniqueTags,
          metadata: {
            ...contentData.metadata,
            concepts: analysis.concepts || [],
            enhancedAt: new Date().toISOString()
          }
        });
        
        console.log('✅ Enhanced content searchability');
        
        return NextResponse.json({
          success: true,
          message: 'Content searchability enhanced',
          analysis
        });
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
    }

    return NextResponse.json({
      success: false,
      message: 'Could not enhance content'
    });

  } catch (error) {
    console.error('Reprocess error:', error);
    return NextResponse.json({ 
      error: 'Failed to reprocess content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// src/lib/services/analyzeText.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface TextAnalysis {
  summary: string;
  keyTopics: string[];
  tags: string[];
  sentiment: string;
  category: string;
  wordCount: number;
  readingTime: number; // in minutes
}

export async function analyzeText(text: string, title?: string): Promise<TextAnalysis> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required');
    }
    
    const wordCount = text.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed
    
    // Analyze with Gemini
    const analysis = await analyzeTextWithGemini(text, title);
    
    return {
      ...analysis,
      wordCount,
      readingTime
    };
  } catch (error) {
    console.error('Error analyzing text:', error);
    throw error;
  }
}

async function analyzeTextWithGemini(text: string, title?: string): Promise<Omit<TextAnalysis, 'wordCount' | 'readingTime'>> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Limit text length for API call
    const truncatedText = text.slice(0, 4000);
    
    const prompt = `
Analyze this text content and provide:
1. A 2-3 sentence summary
2. 3-5 key topics/themes
3. 5-8 relevant tags for categorization
4. Sentiment (positive/negative/neutral)
5. Content category (note, article, research, personal, technical, etc.)

${title ? `Title: ${title}` : ''}
Text content:
${truncatedText}

Format your response as:
Summary: [2-3 sentence summary]
Key Topics: [topic1, topic2, topic3, topic4, topic5]
Tags: [tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8]
Sentiment: [positive/negative/neutral]
Category: [category]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    // Parse the response
    const summaryMatch = analysisText.match(/Summary: ([\s\S]+?)(?=Key Topics:|$)/);
    const keyTopicsMatch = analysisText.match(/Key Topics: ([\s\S]+?)(?=Tags:|$)/);
    const tagsMatch = analysisText.match(/Tags: ([\s\S]+?)(?=Sentiment:|$)/);
    const sentimentMatch = analysisText.match(/Sentiment: ([\s\S]+?)(?=Category:|$)/);
    const categoryMatch = analysisText.match(/Category: ([\s\S]+?)(?=\n|$)/);
    
    const summary = summaryMatch ? summaryMatch[1].trim() : (title || 'Text content');
    const keyTopics = keyTopicsMatch ? 
      keyTopicsMatch[1].split(',').map(topic => topic.trim()).filter(t => t.length > 0) : 
      ['text'];
    const tags = tagsMatch ? 
      tagsMatch[1].split(',').map(tag => tag.trim()).filter(t => t.length > 0) : 
      ['text', 'note'];
    const sentiment = sentimentMatch ? sentimentMatch[1].trim().toLowerCase() : 'neutral';
    const category = categoryMatch ? categoryMatch[1].trim() : 'note';
    
    return {
      summary,
      keyTopics: keyTopics.slice(0, 5),
      tags: tags.slice(0, 8),
      sentiment,
      category
    };
  } catch (error) {
    console.error('Error analyzing text with Gemini:', error);
    return {
      summary: title || 'Text content',
      keyTopics: ['text'],
      tags: ['text', 'note'],
      sentiment: 'neutral',
      category: 'note'
    };
  }
}

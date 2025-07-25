// src/lib/services/extractXContent.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface XPostInfo {
  username: string;
  handle: string;
  postText: string;
  timestamp: string;
  metrics: {
    likes: number;
    reposts: number;
    replies: number;
    views?: number;
  };
  images: string[];
  summary: string;
  tags: string[];
  sentiment: string;
}

export async function extractXContent(url: string): Promise<XPostInfo> {
  try {
    // Extract post ID from URL
    const postId = extractPostId(url);
    if (!postId) {
      throw new Error('Invalid X URL');
    }

    // Scrape post content (since X API requires auth)
    const postData = await scrapeXContent(url);
    
    // Analyze content with Gemini
    const analysis = await analyzeXContent(postData.postText);
    
    return {
      ...postData,
      summary: analysis.summary,
      tags: analysis.tags,
      sentiment: analysis.sentiment
    };
  } catch (error) {
    console.error('Error extracting X content:', error);
    throw error;
  }
}

function extractPostId(url: string): string | null {
  const regex = /twitter\.com\/\w+\/status\/(\d+)|x\.com\/\w+\/status\/(\d+)/;
  const match = url.match(regex);
  return match ? (match[1] || match[2]) : null;
}

async function scrapeXContent(url: string): Promise<Omit<XPostInfo, 'summary' | 'tags' | 'sentiment'>> {
  try {
    // For demo purposes, we'll use a placeholder approach
    // In production, you'd want to use a proper scraping service or API
    
    // Try using a post scraping service or puppeteer
    const response = await fetch(url.replace('twitter.com', 'nitter.net').replace('x.com', 'nitter.net'));
    const html = await response.text();
    
    // Parse basic post info (this is a simplified approach)
    const usernameMatch = html.match(/<title>(.+?) \(@(.+?)\)/);
    const username = usernameMatch ? usernameMatch[1] : 'Unknown User';
    const handle = usernameMatch ? usernameMatch[2] : 'unknown';
    
    // Extract post text (simplified - you'd need more robust parsing)
    const postTextMatch = html.match(/<div class="tweet-content"[^>]*>([\s\S]*?)<\/div>/);
    const postText = postTextMatch ? postTextMatch[1].replace(/<[^>]*>/g, '').trim() : 'X post content';
    
    return {
      username,
      handle,
      postText,
      timestamp: new Date().toISOString(),
      metrics: {
        likes: 0,
        reposts: 0,
        replies: 0
      },
      images: []
    };
  } catch (error) {
    console.warn('Could not scrape X post, using fallback:', error);
    
    // Fallback: extract basic info from URL
    return {
      username: 'X User',
      handle: 'x_user',
      postText: 'X post content',
      timestamp: new Date().toISOString(),
      metrics: {
        likes: 0,
        reposts: 0,
        replies: 0
      },
      images: []
    };
  }
}

async function analyzeXContent(postText: string): Promise<{
  summary: string;
  tags: string[];
  sentiment: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Analyze this X (formerly Twitter) post and provide:
1. A one-sentence summary
2. 3-5 relevant tags/keywords
3. Sentiment (positive/negative/neutral)

X Post: "${postText}"

Format your response as:
Summary: [one sentence summary]
Tags: [tag1, tag2, tag3, tag4, tag5]
Sentiment: [positive/negative/neutral]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const summaryMatch = text.match(/Summary: (.+)/);
    const tagsMatch = text.match(/Tags: (.+)/);
    const sentimentMatch = text.match(/Sentiment: (.+)/);
    
    const summary = summaryMatch ? summaryMatch[1].trim() : postText;
    const tags = tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim()) : ['social', 'x'];
    const sentiment = sentimentMatch ? sentimentMatch[1].trim().toLowerCase() : 'neutral';
    
    return { summary, tags, sentiment };
  } catch (error) {
    console.error('Error analyzing X content:', error);
    return {
      summary: postText,
      tags: ['social', 'x'],
      sentiment: 'neutral'
    };
  }
}

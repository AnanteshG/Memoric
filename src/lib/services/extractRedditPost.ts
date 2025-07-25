// src/lib/services/extractRedditPost.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface RedditPostInfo {
  title: string;
  content: string;
  subreddit: string;
  author: string;
  timestamp: string;
  metrics: {
    upvotes: number;
    comments: number;
    awards?: number;
  };
  summary?: string;
  tags?: string[];
}

export async function extractRedditPost(url: string): Promise<RedditPostInfo> {
  try {
    // Scrape Reddit post content
    const postData = await scrapeRedditPost(url);
    
    // Analyze content with Gemini
    const analysis = await analyzeRedditContent(postData.title, postData.content);
    
    return {
      ...postData,
      summary: analysis.summary,
      tags: analysis.tags
    };
  } catch (error) {
    console.error('Error extracting Reddit post:', error);
    throw error;
  }
}

async function scrapeRedditPost(url: string): Promise<Omit<RedditPostInfo, 'summary' | 'tags'>> {
  try {
    // Convert to JSON API URL
    const jsonUrl = url.endsWith('.json') ? url : url + '.json';
    
    const response = await fetch(jsonUrl);
    const data = await response.json();
    
    if (data && data[0] && data[0].data && data[0].data.children[0]) {
      const post = data[0].data.children[0].data;
      
      return {
        title: post.title,
        content: post.selftext || post.url || 'Reddit post',
        subreddit: post.subreddit,
        author: post.author,
        timestamp: new Date(post.created_utc * 1000).toISOString(),
        metrics: {
          upvotes: post.ups || 0,
          comments: post.num_comments || 0,
          awards: post.total_awards_received || 0
        }
      };
    }
    
    throw new Error('Invalid Reddit post data');
  } catch (error) {
    console.warn('Could not fetch Reddit data, using fallback:', error);
    
    // Fallback: extract basic info from URL
    const subredditMatch = url.match(/r\/([^\/]+)/);
    const subreddit = subredditMatch ? subredditMatch[1] : 'unknown';
    
    return {
      title: 'Reddit Post',
      content: 'Reddit post content',
      subreddit,
      author: 'reddit_user',
      timestamp: new Date().toISOString(),
      metrics: {
        upvotes: 0,
        comments: 0
      }
    };
  }
}

async function analyzeRedditContent(title: string, content: string): Promise<{
  summary: string;
  tags: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Analyze this Reddit post and provide:
1. A one-sentence summary
2. 3-5 relevant tags/keywords

Title: ${title}
Content: ${content.slice(0, 2000)}

Format your response as:
Summary: [one sentence summary]
Tags: [tag1, tag2, tag3, tag4, tag5]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const summaryMatch = text.match(/Summary: (.+)/);
    const tagsMatch = text.match(/Tags: (.+)/);
    
    const summary = summaryMatch ? summaryMatch[1].trim() : title;
    const tags = tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim()) : ['reddit', 'social'];
    
    return { summary, tags };
  } catch (error) {
    console.error('Error analyzing Reddit content:', error);
    return {
      summary: title,
      tags: ['reddit', 'social']
    };
  }
}
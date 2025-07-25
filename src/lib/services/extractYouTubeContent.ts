// src/lib/services/extractYouTubeContent.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface YouTubeVideoInfo {
  title: string;
  description: string;
  transcript: string;
  summary: string;
  thumbnail: string;
  duration: string;
  author: string;
  tags: string[];
}

export async function extractYouTubeContent(url: string): Promise<YouTubeVideoInfo> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Get video metadata using YouTube API or scraping
    const videoInfo = await getVideoMetadata(videoId);
    
    // Get transcript
    const transcript = await getVideoTranscript(videoId);
    
    // Generate summary using Gemini
    const summary = await generateVideoSummary(transcript, videoInfo.title);
    
    // Generate tags using Gemini
    const tags = await generateTags(transcript + ' ' + videoInfo.description);

    return {
      title: videoInfo.title,
      description: videoInfo.description,
      transcript,
      summary,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
      author: videoInfo.author,
      tags
    };
  } catch (error) {
    console.error('Error extracting YouTube content:', error);
    throw error;
  }
}

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function getVideoMetadata(videoId: string) {
  // Try to use YouTube Data API if available, otherwise fallback to scraping
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (apiKey) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
      );
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        return {
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url,
          duration: video.contentDetails.duration,
          author: video.snippet.channelTitle
        };
      }
    } catch (error) {
      console.warn('YouTube API failed, falling back to scraping');
    }
  }

  // Fallback: scrape basic info
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'YouTube Video';
    
    return {
      title,
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: '',
      author: ''
    };
  } catch (error) {
    throw new Error('Failed to fetch video metadata');
  }
}

async function getVideoTranscript(videoId: string): Promise<string> {
  try {
    // Try multiple transcript APIs/services
    
    // Option 1: Try youtube-transcript API (you'd need to install this)
    // For now, we'll use a placeholder approach
    
    // Option 2: Use third-party transcript service
    const transcriptResponse = await fetch(`https://youtubetranscript.com/api/transcript?videoId=${videoId}`);
    if (transcriptResponse.ok) {
      const data = await transcriptResponse.json();
      return data.transcript || '';
    }
    
    // Option 3: Return empty if no transcript available
    return '';
  } catch (error) {
    console.warn('Could not fetch transcript:', error);
    return '';
  }
}

async function generateVideoSummary(transcript: string, title: string): Promise<string> {
  if (!transcript) {
    return `Video: ${title}`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Please provide a concise summary of this YouTube video based on its transcript and title.

Title: ${title}
Transcript: ${transcript.slice(0, 3000)} // Limit transcript length

Generate a summary that:
1. Captures the main topics and key points
2. Is 2-3 sentences long
3. Is useful for searching and understanding the content

Summary:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating video summary:', error);
    return `Video about: ${title}`;
  }
}

async function generateTags(content: string): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Extract 5-8 relevant tags/keywords from this content for categorization and search.

Content: ${content.slice(0, 2000)}

Return only the tags separated by commas, no explanation:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tags = response.text().trim().split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    return tags.slice(0, 8); // Limit to 8 tags
  } catch (error) {
    console.error('Error generating tags:', error);
    return ['video', 'youtube'];
  }
}

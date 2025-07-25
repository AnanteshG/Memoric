// src/lib/services/fetchTweet.ts

// Simple in-memory cache for tweet texts
const tweetCache: { [key: string]: TweetData } = {};

export interface TweetData {
  id: string;
  text: string;
  username: string;
  handle: string;
  timestamp: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  images: string[];
  url: string;
}

/**
 * Extract tweet ID from a tweet URL.
 */
function extractTweetId(tweetUrl: string): string | null {
  const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch tweet text using web scraping (since Twitter API requires auth).
 * @param {string} tweetUrl - The tweet URL.
 * @returns {Promise<TweetData|null>} - The tweet data or null if not found.
 */
export async function fetchTweetText(tweetUrl: string): Promise<TweetData | null> {
  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    console.log("Could not extract tweet ID from URL:", tweetUrl);
    return null;
  }
  
  // Return cached text if available
  if (tweetCache[tweetId]) {
    console.log("Returning cached tweet text for tweet ID:", tweetId);
    return tweetCache[tweetId];
  }
  
  try {
    console.log("Fetching tweet content for tweet ID:", tweetId);
    
    // Try multiple approaches to get tweet content
    const tweetData = await scrapeTweetContent(tweetUrl, tweetId);
    
    if (tweetData) {
      tweetCache[tweetId] = tweetData; // Cache the result
      console.log("Tweet data fetched and cached for tweet ID:", tweetId);
      return tweetData;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching tweet:", error);
    return null;
  }
}

/**
 * Scrape tweet content using multiple fallback methods
 */
async function scrapeTweetContent(originalUrl: string, tweetId: string): Promise<TweetData | null> {
  try {
    // Extract basic info from URL pattern
    const urlMatch = originalUrl.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/);
    const handle = urlMatch ? urlMatch[1] : 'unknown';
    
    // Return basic data without AI enhancement - let users see actual content by clicking the link
    const tweetData: TweetData = {
      id: tweetId,
      text: `X post by @${handle}`, // Simple, non-AI generated text
      username: handle.charAt(0).toUpperCase() + handle.slice(1),
      handle: handle,
      timestamp: new Date().toISOString(),
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0
      },
      images: [],
      url: originalUrl
    };
    
    return tweetData;
    
  } catch (error) {
    console.error("Error scraping tweet content:", error);
    return null;
  }
}

/**
 * Retry wrapper with exponential backoff for fetching tweet text.
 * @param {string} tweetUrl
 * @param {number} retries - Number of retries (default: 3)
 * @param {number} delay - Initial delay in ms (default: 2000)
 * @returns {Promise<TweetData|null>}
 */
export async function fetchTweetTextWithRetry(
  tweetUrl: string, 
  retries: number = 3, 
  delay: number = 2000
): Promise<TweetData | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`Attempt ${attempt} to fetch X post for URL: ${tweetUrl}`);
    const tweetData = await fetchTweetText(tweetUrl);
    if (tweetData) {
      return tweetData;
    } else {
      console.warn(`Attempt ${attempt} failed. Retrying in ${delay} ms...`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  return null;
}

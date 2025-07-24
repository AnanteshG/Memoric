// src/app/api/external/reddit/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract post details from Reddit URL
    const redditMatch = url.match(/reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)\/([^\/]+)/);
    if (!redditMatch) {
      return NextResponse.json({ error: 'Invalid Reddit URL' }, { status: 400 });
    }

    const [, subreddit, postId, postSlug] = redditMatch;

    try {
      // Reddit allows JSON access by appending .json to the URL
      const apiUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}/${postSlug}.json`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Memoric-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch from Reddit');
      }

      const redditData = await response.json();
      const post = redditData[0]?.data?.children?.[0]?.data;

      if (!post) {
        throw new Error('Post not found');
      }

      const processedData = {
        id: post.id,
        title: post.title,
        selftext: post.selftext,
        author: post.author,
        subreddit: post.subreddit,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        permalink: post.permalink,
        url: post.url,
        is_video: post.is_video,
        thumbnail: post.thumbnail !== 'self' && post.thumbnail !== 'default' ? post.thumbnail : null,
        preview: post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') || null
      };

      return NextResponse.json({
        success: true,
        data: processedData,
        metadata: {
          platform: 'reddit',
          type: 'post',
          url: url,
          subreddit: subreddit
        }
      });

    } catch (fetchError) {
      // Fallback to mock data if Reddit API fails
      console.warn('Reddit API failed, using mock data:', fetchError);
      
      const mockRedditData = {
        id: postId,
        title: "Sample Reddit Post Title",
        selftext: "This is a sample Reddit post content. The actual content would be fetched from Reddit's API.",
        author: "sampleuser",
        subreddit: subreddit,
        score: 125,
        num_comments: 15,
        created_utc: Math.floor(Date.now() / 1000),
        permalink: `/r/${subreddit}/comments/${postId}/${postSlug}/`,
        url: url,
        is_video: false,
        thumbnail: null,
        preview: null
      };

      return NextResponse.json({
        success: true,
        data: mockRedditData,
        metadata: {
          platform: 'reddit',
          type: 'post',
          url: url,
          subreddit: subreddit,
          note: 'Mock data - Reddit API may be unavailable'
        }
      });
    }

  } catch (error) {
    console.error('Reddit API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Reddit data' },
      { status: 500 }
    );
  }
}

// src/app/api/external/x/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchTweetTextWithRetry } from '@/lib/services/fetchTweet';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    const urlPattern = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
    if (!urlPattern.test(url)) {
      return NextResponse.json({ error: 'Invalid X/Twitter URL format' }, { status: 400 });
    }

    console.log('📱 Fetching X post data for URL:', url);

    // Fetch tweet data using our service
    const tweetData = await fetchTweetTextWithRetry(url);
    
    if (!tweetData) {
      console.error('❌ Failed to fetch tweet data');
      return NextResponse.json({ error: 'Failed to fetch tweet data' }, { status: 500 });
    }

    console.log('✅ Successfully fetched tweet data:', tweetData.id);

    // Return the structured tweet data
    return NextResponse.json({
      success: true,
      data: {
        id: tweetData.id,
        text: tweetData.text,
        author: {
          name: tweetData.username,
          username: tweetData.handle,
          profile_image_url: `https://unavatar.io/twitter/${tweetData.handle}`
        },
        created_at: tweetData.timestamp,
        public_metrics: {
          repost_count: tweetData.metrics.retweets,
          like_count: tweetData.metrics.likes,
          reply_count: tweetData.metrics.replies,
          view_count: tweetData.metrics.views || 0
        },
        entities: {
          hashtags: [],
          urls: [{ expanded_url: tweetData.url }]
        },
        attachments: {
          media_keys: tweetData.images || []
        }
      },
      metadata: {
        platform: 'x',
        type: 'tweet',
        url: url,
        originalUrl: tweetData.url
      }
    });

  } catch (error) {
    console.error('X API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch X data' },
      { status: 500 }
    );
  }
}

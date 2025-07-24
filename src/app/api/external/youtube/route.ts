// src/app/api/external/youtube/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extract video ID from YouTube URL
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
    }

    const videoId = videoIdMatch[1];

    // Check if YouTube Data API key is available
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (apiKey) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics,contentDetails`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('YouTube API request failed');
        }

        const data = await response.json();
        const video = data.items?.[0];

        if (!video) {
          throw new Error('Video not found');
        }

        const processedData = {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          thumbnails: video.snippet.thumbnails,
          duration: video.contentDetails.duration,
          viewCount: video.statistics.viewCount,
          likeCount: video.statistics.likeCount,
          commentCount: video.statistics.commentCount,
          tags: video.snippet.tags || []
        };

        return NextResponse.json({
          success: true,
          data: processedData,
          metadata: {
            platform: 'youtube',
            type: 'video',
            url: url,
            videoId: videoId
          }
        });

      } catch (apiError) {
        console.warn('YouTube API failed, using mock data:', apiError);
      }
    }

    // Fallback to mock data if API key is not available or API fails
    const mockYouTubeData = {
      id: videoId,
      title: "Sample YouTube Video Title",
      description: "This is a sample YouTube video description. The actual content would be fetched from YouTube's Data API.",
      channelTitle: "Sample Channel",
      publishedAt: new Date().toISOString(),
      thumbnails: {
        default: { url: `https://img.youtube.com/vi/${videoId}/default.jpg` },
        medium: { url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
        high: { url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
        maxres: { url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` }
      },
      duration: "PT5M30S",
      viewCount: "10000",
      likeCount: "500",
      commentCount: "25",
      tags: ["sample", "video", "youtube"]
    };

    return NextResponse.json({
      success: true,
      data: mockYouTubeData,
      metadata: {
        platform: 'youtube',
        type: 'video',
        url: url,
        videoId: videoId,
        note: 'Mock data - Add YOUTUBE_API_KEY to environment variables for real data'
      }
    });

  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch YouTube data' },
      { status: 500 }
    );
  }
}

/* 
To integrate with real YouTube Data API v3:

1. Get API key from Google Cloud Console
2. Enable YouTube Data API v3
3. Add to environment variables: YOUTUBE_API_KEY=your_api_key_here
4. The API will automatically use real data when the key is available
*/

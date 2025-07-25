// src/lib/services/processContent.ts
import { extractXContent } from './extractXContent';
import { extractYouTubeContent } from './extractYouTubeContent';
import { extractPdfText } from './extractPdfText';
import { analyzeImage } from './analyzeImage';
import { analyzeText } from './analyzeText';
import { extractRedditPost } from './extractRedditPost';

interface ProcessedContent {
  title: string;
  content: string;
  summary: string;
  tags: string[];
  thumbnail?: string;
  metadata: any;
  searchableText: string; // Combined text for search
}

export async function processContent(
  type: string, 
  data: any
): Promise<ProcessedContent> {
  try {
    switch (type) {
      case 'tweet':
      case 'x':
        return await processXContent(data);
      case 'youtube':
        return await processYouTubeContent(data);
      case 'document':
        return await processPdfContent(data);
      case 'image':
        return await processImageContent(data);
      case 'text':
        return await processTextContent(data);
      case 'reddit':
        return await processRedditContent(data);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  } catch (error) {
    console.error('Error processing content:', error);
    throw error;
  }
}

async function processXContent(data: { url: string }): Promise<ProcessedContent> {
  const xData = await extractXContent(data.url);
  
  const searchableText = [
    xData.username,
    xData.handle,
    xData.postText,
    xData.summary,
    ...xData.tags
  ].join(' ');
  
  return {
    title: `X Post by @${xData.handle}`,
    content: xData.postText,
    summary: xData.summary,
    tags: xData.tags,
    metadata: {
      type: 'x',
      username: xData.username,
      handle: xData.handle,
      metrics: xData.metrics,
      sentiment: xData.sentiment,
      images: xData.images,
      timestamp: xData.timestamp
    },
    searchableText
  };
}

async function processYouTubeContent(data: { url: string }): Promise<ProcessedContent> {
  const youtubeData = await extractYouTubeContent(data.url);
  
  const searchableText = [
    youtubeData.title,
    youtubeData.description,
    youtubeData.transcript,
    youtubeData.summary,
    youtubeData.author,
    ...youtubeData.tags
  ].join(' ');
  
  return {
    title: youtubeData.title,
    content: youtubeData.transcript || youtubeData.description,
    summary: youtubeData.summary,
    tags: youtubeData.tags,
    metadata: {
      type: 'youtube',
      author: youtubeData.author,
      duration: youtubeData.duration,
      thumbnail: youtubeData.thumbnail,
      description: youtubeData.description,
      transcript: youtubeData.transcript
    },
    searchableText
  };
}

async function processPdfContent(data: { file: File }): Promise<ProcessedContent> {
  const pdfData = await extractPdfText(data.file);
  
  const searchableText = [
    data.file.name,
    pdfData.text,
    pdfData.summary,
    pdfData.documentType,
    ...pdfData.keyTopics,
    ...pdfData.tags
  ].join(' ');
  
  return {
    title: data.file.name.replace('.pdf', ''),
    content: pdfData.text,
    summary: pdfData.summary,
    tags: pdfData.tags,
    thumbnail: pdfData.thumbnailUrl,
    metadata: {
      type: 'document',
      documentType: pdfData.documentType,
      keyTopics: pdfData.keyTopics,
      fileName: data.file.name,
      fileSize: data.file.size
    },
    searchableText
  };
}

async function processImageContent(data: { file: File }): Promise<ProcessedContent> {
  const imageData = await analyzeImage(data.file);
  
  const searchableText = [
    data.file.name,
    imageData.description,
    imageData.text,
    imageData.category,
    ...imageData.objects,
    ...imageData.tags,
    ...imageData.colors
  ].join(' ');
  
  return {
    title: data.file.name,
    content: imageData.description,
    summary: imageData.description,
    tags: imageData.tags,
    metadata: {
      type: 'image',
      objects: imageData.objects,
      extractedText: imageData.text,
      category: imageData.category,
      colors: imageData.colors,
      fileName: data.file.name,
      fileSize: data.file.size
    },
    searchableText
  };
}

async function processTextContent(data: { title: string; content: string }): Promise<ProcessedContent> {
  const textData = await analyzeText(data.content, data.title);
  
  const searchableText = [
    data.title,
    data.content,
    textData.summary,
    textData.category,
    ...textData.keyTopics,
    ...textData.tags
  ].join(' ');
  
  return {
    title: data.title,
    content: data.content,
    summary: textData.summary,
    tags: textData.tags,
    metadata: {
      type: 'text',
      keyTopics: textData.keyTopics,
      sentiment: textData.sentiment,
      category: textData.category,
      wordCount: textData.wordCount,
      readingTime: textData.readingTime
    },
    searchableText
  };
}

async function processRedditContent(data: { url: string }): Promise<ProcessedContent> {
  const redditData = await extractRedditPost(data.url);
  
  const searchableText = [
    redditData.title,
    redditData.content,
    redditData.subreddit,
    redditData.author,
    redditData.summary || '',
    ...(redditData.tags || [])
  ].join(' ');
  
  return {
    title: redditData.title,
    content: redditData.content,
    summary: redditData.summary || redditData.content.slice(0, 200) + '...',
    tags: redditData.tags || ['reddit', redditData.subreddit],
    metadata: {
      type: 'reddit',
      subreddit: redditData.subreddit,
      author: redditData.author,
      metrics: redditData.metrics,
      timestamp: redditData.timestamp
    },
    searchableText
  };
}

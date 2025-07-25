// src/lib/services/extractPdfText.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface PdfAnalysis {
  text: string;
  summary: string;
  keyTopics: string[];
  tags: string[];
  documentType: string;
  thumbnailUrl?: string;
}

export async function extractPdfText(file: File): Promise<PdfAnalysis> {
  try {
    // Convert PDF to text
    const text = await pdfToText(file);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Could not extract text from PDF');
    }

    // Generate PDF thumbnail
    const thumbnailUrl = await generatePdfThumbnail(file);
    
    // Analyze with Gemini
    const analysis = await analyzePdfContent(text);
    
    return {
      text,
      thumbnailUrl,
      ...analysis
    };
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

async function pdfToText(file: File): Promise<string> {
  try {
    // Method 1: Use browser's built-in capabilities or send to server
    // For now, we'll use a server endpoint approach
    
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.text || 'PDF text extracted successfully';
    }
    
    // Fallback: basic file info
    return `PDF document: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    
  } catch (error) {
    console.error('Error converting PDF to text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

async function generatePdfThumbnail(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch('/api/pdf-thumbnail', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.thumbnailUrl;
    }
    
    throw new Error('Failed to generate thumbnail');
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    // Return a placeholder or null if thumbnail generation fails
    return '';
  }
}

async function analyzePdfContent(text: string): Promise<Omit<PdfAnalysis, 'text' | 'thumbnailUrl'>> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Limit text length for API call
    const truncatedText = text.slice(0, 5000);
    
    const prompt = `
Analyze this document text and provide:
1. A 2-3 sentence summary
2. 3-5 key topics/themes
3. 5-8 relevant tags for categorization
4. Document type (research paper, manual, report, article, etc.)

Document text:
${truncatedText}

Format your response as:
Summary: [2-3 sentence summary]
Key Topics: [topic1, topic2, topic3, topic4, topic5]
Tags: [tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8]
Document Type: [type]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysisText = response.text();
    
    // Parse the response
    const summaryMatch = analysisText.match(/Summary: ([\s\S]+?)(?=Key Topics:|$)/);
    const keyTopicsMatch = analysisText.match(/Key Topics: ([\s\S]+?)(?=Tags:|$)/);
    const tagsMatch = analysisText.match(/Tags: ([\s\S]+?)(?=Document Type:|$)/);
    const docTypeMatch = analysisText.match(/Document Type: ([\s\S]+?)(?=\n|$)/);
    
    const summary = summaryMatch ? summaryMatch[1].trim() : 'Document analysis';
    const keyTopics = keyTopicsMatch ? 
      keyTopicsMatch[1].split(',').map(topic => topic.trim()).filter(t => t.length > 0) : 
      ['document'];
    const tags = tagsMatch ? 
      tagsMatch[1].split(',').map(tag => tag.trim()).filter(t => t.length > 0) : 
      ['document', 'pdf'];
    const documentType = docTypeMatch ? docTypeMatch[1].trim() : 'document';
    
    return {
      summary,
      keyTopics: keyTopics.slice(0, 5),
      tags: tags.slice(0, 8),
      documentType
    };
  } catch (error) {
    console.error('Error analyzing PDF content:', error);
    return {
      summary: 'PDF document content',
      keyTopics: ['document'],
      tags: ['document', 'pdf'],
      documentType: 'document'
    };
  }
}

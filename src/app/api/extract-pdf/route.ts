// src/app/api/extract-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    console.log('📄 Processing PDF:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use Gemini to extract text from PDF
    const text = await extractTextWithGemini(buffer, file.name);
    
    console.log('✅ PDF text extracted. Length:', text.length, 'characters');
    
    return NextResponse.json({
      success: true,
      text,
      fileName: file.name,
      fileSize: file.size,
      extractedLength: text.length
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json({ 
      error: 'Failed to process PDF', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function extractTextWithGemini(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Convert buffer to base64
    const base64Data = buffer.toString('base64');
    
    const prompt = `Please extract ALL the text content from this PDF document. 
    Return only the extracted text without any additional formatting or commentary.
    Make sure to capture:
    - All paragraphs and text blocks
    - Headers and titles
    - Lists and bullet points
    - Any tables or structured data
    - Contact information, dates, names
    - Technical content, code, or formulas
    
    Extract the complete text content:`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const extractedText = response.text();
    
    if (extractedText && extractedText.trim().length > 0) {
      console.log('✅ Gemini successfully extracted text from PDF');
      return extractedText.trim();
    } else {
      throw new Error('No text extracted from PDF');
    }
    
  } catch (error) {
    console.error('Error extracting with Gemini:', error);
    
    // Fallback: return file info with instruction for manual processing
    return `PDF Document: ${fileName}
    
File Size: ${Math.round(buffer.length / 1024)} KB

Note: This PDF file has been uploaded to your knowledge base, but automatic text extraction encountered an issue. 
The file contains content that may include:
- Text documents, reports, or articles
- Research papers or academic content  
- Technical documentation
- Personal documents like resumes or CVs
- Business documents or presentations

To get the specific content, please try asking specific questions about what you're looking for in this document, 
or re-upload the file if the text extraction continues to fail.`;
  }
}

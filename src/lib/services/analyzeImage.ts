// src/lib/services/analyzeImage.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

interface ImageAnalysis {
  description: string;
  objects: string[];
  text: string; // OCR text if any
  tags: string[];
  category: string;
  colors: string[];
}

export async function analyzeImage(file: File): Promise<ImageAnalysis> {
  try {
    // Convert image to base64
    const base64Image = await fileToBase64(file);
    
    // Analyze with Gemini Vision
    const analysis = await analyzeImageWithGemini(base64Image);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeImageWithGemini(base64Image: string): Promise<ImageAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-vision" });
    
    const prompt = `
Analyze this image and provide:
1. A detailed description of what you see
2. List of main objects/subjects in the image
3. Any text visible in the image (OCR)
4. 5-8 relevant tags for categorization
5. General category (photo, screenshot, diagram, artwork, etc.)
6. Dominant colors

Format your response as:
Description: [detailed description]
Objects: [object1, object2, object3, ...]
Text: [any visible text or "None"]
Tags: [tag1, tag2, tag3, tag4, tag5, tag6, tag7, tag8]
Category: [category]
Colors: [color1, color2, color3, ...]`;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg" // Adjust based on actual file type
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const analysisText = response.text();
    
    // Parse the response
    const descriptionMatch = analysisText.match(/Description: ([\s\S]+?)(?=Objects:|$)/);
    const objectsMatch = analysisText.match(/Objects: ([\s\S]+?)(?=Text:|$)/);
    const textMatch = analysisText.match(/Text: ([\s\S]+?)(?=Tags:|$)/);
    const tagsMatch = analysisText.match(/Tags: ([\s\S]+?)(?=Category:|$)/);
    const categoryMatch = analysisText.match(/Category: ([\s\S]+?)(?=Colors:|$)/);
    const colorsMatch = analysisText.match(/Colors: ([\s\S]+?)(?=\n|$)/);
    
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'Image content';
    const objects = objectsMatch ? 
      objectsMatch[1].split(',').map(obj => obj.trim()).filter(o => o.length > 0) : 
      ['image'];
    const text = textMatch ? textMatch[1].trim() : '';
    const tags = tagsMatch ? 
      tagsMatch[1].split(',').map(tag => tag.trim()).filter(t => t.length > 0) : 
      ['image'];
    const category = categoryMatch ? categoryMatch[1].trim() : 'image';
    const colors = colorsMatch ? 
      colorsMatch[1].split(',').map(color => color.trim()).filter(c => c.length > 0) : 
      ['unknown'];
    
    return {
      description,
      objects: objects.slice(0, 10),
      text: text === 'None' ? '' : text,
      tags: tags.slice(0, 8),
      category,
      colors: colors.slice(0, 5)
    };
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);
    
    // Fallback analysis
    return {
      description: 'Image uploaded to knowledge base',
      objects: ['image'],
      text: '',
      tags: ['image', 'visual', 'uploaded'],
      category: 'image',
      colors: ['unknown']
    };
  }
}

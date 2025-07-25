// src/app/api/pdf-thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    // Generate a more sophisticated placeholder thumbnail with file info
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const fileSize = (file.size / 1024).toFixed(1) + ' KB';
    
    const placeholderThumbnail = `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="200" height="280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f87171;stop-opacity:0.1" />
            <stop offset="100%" style="stop-color:#dc2626;stop-opacity:0.2" />
          </linearGradient>
          <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f9fafb;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bgGrad)" rx="12"/>
        
        <!-- Main page -->
        <rect x="20" y="20" width="160" height="240" fill="url(#pageGrad)" rx="8" stroke="#e5e7eb" stroke-width="1"/>
        
        <!-- Page fold -->
        <path d="M 160 20 L 180 20 L 180 40 L 160 40 Z" fill="#f3f4f6" stroke="#d1d5db"/>
        <path d="M 160 20 L 160 40 L 180 40" fill="none" stroke="#d1d5db" stroke-width="1"/>
        
        <!-- Text lines -->
        <rect x="35" y="45" width="110" height="6" fill="#9ca3af" rx="3"/>
        <rect x="35" y="60" width="90" height="6" fill="#d1d5db" rx="3"/>
        <rect x="35" y="75" width="120" height="6" fill="#d1d5db" rx="3"/>
        <rect x="35" y="90" width="85" height="6" fill="#d1d5db" rx="3"/>
        <rect x="35" y="105" width="100" height="6" fill="#d1d5db" rx="3"/>
        <rect x="35" y="120" width="115" height="6" fill="#d1d5db" rx="3"/>
        <rect x="35" y="135" width="75" height="6" fill="#d1d5db" rx="3"/>
        
        <!-- PDF Icon -->
        <circle cx="100" cy="190" r="25" fill="#dc2626"/>
        <text x="100" y="198" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">PDF</text>
        
        <!-- File info -->
        <text x="100" y="230" text-anchor="middle" fill="#374151" font-family="Arial, sans-serif" font-size="10" font-weight="500">${fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName}</text>
        <text x="100" y="245" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="9">${fileSize}</text>
      </svg>
    `).toString('base64')}`;
    
    return NextResponse.json({
      success: true,
      thumbnailUrl: placeholderThumbnail,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type
    });
  } catch (error) {
    console.error('PDF thumbnail generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF thumbnail' }, { status: 500 });
  }
}

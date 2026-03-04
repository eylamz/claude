import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    // Await params since it's a Promise in Next.js 16
    const { name: iconName } = await params;
    
    // Security: Only allow alphanumeric, hyphen, and underscore
    if (!/^[a-zA-Z0-9-_]+$/.test(iconName)) {
      return NextResponse.json({ error: 'Invalid icon name' }, { status: 400 });
    }

    // Path to the icons directory - process.cwd() should be nextjs-app directory
    const iconsPath = join(process.cwd(), 'components', 'icons', `${iconName}.svg`);
    
    try {
      const svgContent = await readFile(iconsPath, 'utf-8');
      
      return new NextResponse(svgContent, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (fileError: any) {
    // Log the actual path and error for debugging (server-side only; do not expose path to client)
    console.error(`Failed to read icon file: ${iconsPath}`, fileError.message);
      return NextResponse.json(
        { error: `Icon "${iconName}" not found` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error serving icon:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


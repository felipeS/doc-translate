import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || ''
  
  return NextResponse.json({
    apiKey: apiKey ? 'configured' : '',
  })
}

export async function POST(request: Request) {
  // API key is now stored in environment variable, not in DB
  // This endpoint is kept for compatibility but doesn't save anything
  try {
    const { apiKey } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Please set GEMINI_API_KEY environment variable on your deployment platform' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      message: 'API key should be set as GEMINI_API_KEY environment variable, not in the app' 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

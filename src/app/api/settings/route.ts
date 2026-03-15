import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.LLM_MODEL || 'google/gemini-2.0-flash',
  })
}

export async function POST() {
  // API config is now stored in environment variables
  return NextResponse.json({
    message: 'API configuration is managed via environment variables: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL'
  })
}

import { NextRequest, NextResponse } from 'next/server'
import FormData from 'form-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Python backend URL - set via env var or use default
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    
    // Convert to FormData for Python backend
    const pythonFormData = new FormData()
    
    const file = formData.get('file') as File | null
    const targetLanguage = formData.get('targetLanguage') as string | null
    const sourceLanguage = formData.get('sourceLanguage') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    if (!targetLanguage) {
      return NextResponse.json({ error: 'No target language provided' }, { status: 400 })
    }
    
    // Convert Next.js File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    pythonFormData.append('file', buffer, {
      filename: file.name,
      contentType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })
    pythonFormData.append('targetLanguage', targetLanguage)
    if (sourceLanguage) {
      pythonFormData.append('sourceLanguage', sourceLanguage)
    }
    
    // Forward to Python backend
    const pythonUrl = `${PYTHON_API_URL}/translate`
    console.log('Proxying to Python backend:', pythonUrl)
    
    const response = await fetch(pythonUrl, {
      method: 'POST',
      body: pythonFormData as any,
      headers: {
        ...pythonFormData.getHeaders(),
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Python API error:', errorText)
      return NextResponse.json({ 
        error: `Translation failed: ${errorText}` 
      }, { status: response.status })
    }
    
    // Get the translated file from Python
    const translatedBuffer = await response.arrayBuffer()
    
    // Return the translated file
    return new NextResponse(Buffer.from(translatedBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="translated_${file.name}"`,
      },
    })
    
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    )
  }
}

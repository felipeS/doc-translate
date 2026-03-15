import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { extractDocumentXml, extractParagraphs, translateParagraphsXml, createTranslatedDocx } from '@/lib/docx'
import { buildPrompt } from '@/lib/llm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GLOSSARY_FILE = path.join(process.cwd(), 'glossary.json')

function getGlossary(): Record<string, string> {
  try {
    if (fs.existsSync(GLOSSARY_FILE)) {
      const data = fs.readFileSync(GLOSSARY_FILE, 'utf-8')
      const terms = JSON.parse(data)
      return Object.fromEntries(terms.map((t: { source: string; target: string }) => [t.source, t.target]))
    }
  } catch (e) {
    console.error('Error reading glossary:', e)
  }
  return {}
}

function getLLMConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.LLM_MODEL || 'google/gemini-2.0-flash',
  }
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', pl: 'Polish', tr: 'Turkish',
  vi: 'Vietnamese', th: 'Thai', sv: 'Swedish', da: 'Danish', fi: 'Finnish',
  no: 'Norwegian', cs: 'Czech', el: 'Greek', he: 'Hebrew', id: 'Indonesian',
  ms: 'Malay', ro: 'Romanian', uk: 'Ukrainian',
}

async function callLLM(prompt: string, config: { apiKey: string; baseUrl: string; model: string }): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LLM API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function POST(request: NextRequest) {
  try {
    const config = getLLMConfig()

    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'LLM_API_KEY not configured. Please set it in your environment variables.' },
        { status: 400 }
      )
    }

    // Get glossary from JSON file
    const glossary = getGlossary()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetLanguage = formData.get('targetLanguage') as string || 'en'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('Processing file:', file.name, 'size:', file.size)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    console.log('Buffer size:', fileBuffer.length)
    console.log('First bytes:', fileBuffer.slice(0, 4).toString('hex'))

    // Check if it's a valid DOCX (PK\x03\x04)
    if (!fileBuffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      return NextResponse.json(
        { error: 'Invalid DOCX file - not a valid zip file' },
        { status: 400 }
      )
    }

    // Extract and translate
    const { xml, zip } = await extractDocumentXml(fileBuffer)
    console.log('XML parsed, looking for paragraphs...')
    
    const paragraphs = extractParagraphs(xml)
    console.log('Found paragraphs:', paragraphs.length)

    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: 'No text found in document. The document may be empty or in an unsupported format.' },
        { status: 400 }
      )
    }

    // Translate paragraphs in batches
    const translatedTexts: string[] = []
    const batchSize = 10

    for (let i = 0; i < paragraphs.length; i += batchSize) {
      const batch = paragraphs.slice(i, i + batchSize)
      const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage
      const prompt = buildPrompt(batch.map(p => p.text), glossary, targetLangName)
      const translated = await callLLM(prompt, config)
      
      const lines = translated.split('\n\n').filter(t => t.trim())
      translatedTexts.push(...lines)
      console.log(`Translated batch ${i/batchSize + 1}: ${lines.length} paragraphs`)
    }

    // Apply translations to XML
    translateParagraphsXml(xml, translatedTexts)

    // Create new DOCX
    const translatedBuffer = await createTranslatedDocx(zip, xml)
    console.log('Generated translated DOCX:', translatedBuffer.length, 'bytes')

    // Return file
    return new NextResponse(translatedBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="translated_${file.name}"`,
      },
    })

  } catch (error) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    )
  }
}

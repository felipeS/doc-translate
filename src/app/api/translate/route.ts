import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { extractDocumentXml, extractParagraphs, translateParagraphsXml, createTranslatedDocx } from '@/lib/docx'
import { translateText } from '@/lib/gemini'

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

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured. Please set it in your environment variables.' },
        { status: 400 }
      )
    }

    // Get glossary from JSON file
    const glossary = getGlossary()

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Check if it's a valid DOCX
    if (!fileBuffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      return NextResponse.json(
        { error: 'Invalid DOCX file' },
        { status: 400 }
      )
    }

    // Extract and translate
    const { xml, zip } = await extractDocumentXml(fileBuffer)
    const paragraphs = extractParagraphs(xml)

    if (paragraphs.length === 0) {
      return NextResponse.json(
        { error: 'No text found in document' },
        { status: 400 }
      )
    }

    // Translate paragraphs
    const translatedTexts = await translateText(
      apiKey,
      paragraphs.map(p => p.text),
      glossary
    )

    // Apply translations to XML
    translateParagraphsXml(xml, translatedTexts)

    // Create new DOCX
    const translatedBuffer = await createTranslatedDocx(zip, xml)

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

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { extractDocumentXml, extractUnits, applyTranslations, createTranslatedDocx } from '@/lib/docx'
import { buildTranslationPrompt, parseTranslationResponse, lockPlaceholders, unlockPlaceholders, detectLanguage, checkTranslationQuality, TranslationUnit } from '@/lib/translate'

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

    const glossary = getGlossary()
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetLanguage = formData.get('targetLanguage') as string || 'en'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing file:', file.name)

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    if (!fileBuffer.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
      return NextResponse.json({ error: 'Invalid DOCX file' }, { status: 400 })
    }

    const { xml, zip } = await extractDocumentXml(fileBuffer)
    const units = extractUnits(xml)
    
    console.log('Extracted units:', units.length)

    if (units.length === 0) {
      return NextResponse.json({ error: 'No text found in document' }, { status: 400 })
    }

    // Detect source language from first few units
    const sampleText = units.slice(0, 5).map(u => u.text).join(' ')
    const sourceLang = detectLanguage(sampleText)
    console.log('Detected source language:', sourceLang)

    const targetLangName = LANGUAGE_NAMES[targetLanguage] || targetLanguage

    // Process in batches with context
    const translations = new Map<string, string>()
    const batchSize = 15  // Moderate batch size for quality
    
    for (let i = 0; i < units.length; i += batchSize) {
      const batchUnits: TranslationUnit[] = []
      
      // Add context units (previous)
      if (i > 0) {
        const contextStart = Math.max(0, i - 2)
        for (let j = contextStart; j < i; j++) {
          batchUnits.push({
            id: units[j].id,
            role: 'context_only',
            kind: 'paragraph',
            text: units[j].text
          })
        }
      }
      
      // Add translate units
      const batchEnd = Math.min(i + batchSize, units.length)
      for (let j = i; j < batchEnd; j++) {
        const unit = units[j]
        // Lock placeholders before translation
        const { locked } = lockPlaceholders(unit.text)
        batchUnits.push({
          id: unit.id,
          role: 'translate',
          kind: 'paragraph',
          text: locked
        })
      }
      
      // Add context units (next)
      if (batchEnd < units.length) {
        const contextEnd = Math.min(units.length, batchEnd + 2)
        for (let j = batchEnd; j < contextEnd; j++) {
          batchUnits.push({
            id: units[j].id,
            role: 'context_only',
            kind: 'paragraph',
            text: units[j].text
          })
        }
      }

      // Build prompt
      const prompt = buildTranslationPrompt(batchUnits, {
        targetLanguage: targetLangName,
        sourceLanguage: sourceLang.lang,
        domain: 'general',
        tone: 'neutral',
        glossary
      })

      // Call LLM with retry
      let responseText = ''
      let retries = 0
      const maxRetries = 2
      
      while (retries < maxRetries) {
        try {
          responseText = await callLLM(prompt, config)
          const results = parseTranslationResponse(
            responseText,
            batchUnits.filter(u => u.role === 'translate').map(u => u.id)
          )
          
          for (const result of results) {
            // Set translation directly (placeholders locked before sending)
            translations.set(result.id, result.text)
          }
          break
        } catch (e) {
          retries++
          if (retries >= maxRetries) {
            console.error(`Batch ${i} failed after ${maxRetries} retries:`, e)
            throw e
          }
          console.log(`Retry ${retries} for batch starting at ${i}`)
        }
      }

      console.log(`Translated batch ${Math.floor(i / batchSize) + 1}: ${batchEnd - i} units`)
    }

    // Quality check
    const translateUnits = units.map(u => ({ 
      id: u.id, 
      role: 'translate' as const, 
      kind: 'paragraph' as const,
      text: u.text 
    }))
    const qualityResult = checkTranslationQuality(translateUnits, translations, glossary)
    
    if (!qualityResult.passed) {
      console.warn('Quality issues:', qualityResult.issues)
    }

    // Apply translations to XML
    applyTranslations(units, translations)

    const translatedBuffer = await createTranslatedDocx(zip, xml)

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

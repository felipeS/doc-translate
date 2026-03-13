import { GoogleGenerativeAI } from '@google/generative-ai'

export async function translateText(
  apiKey: string,
  paragraphs: string[],
  glossary: Record<string, string>,
  targetLanguage: string = 'English'
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Build glossary instruction
  const glossaryEntries = Object.entries(glossary)
  let glossaryInstruction = ''
  
  if (glossaryEntries.length > 0) {
    const glossaryJson = JSON.stringify(Object.fromEntries(glossaryEntries))
    glossaryInstruction = `
IMPORTANT - MANDATORY GLOSSARY:
You MUST use the following exact translations. Do not deviate from these terms:
${glossaryJson}

When you encounter these source terms, you MUST use the target translation provided above.
`
  }

  // Translate in batches
  const translated: string[] = []
  const batchSize = 10

  for (let i = 0; i < paragraphs.length; i += batchSize) {
    const batch = paragraphs.slice(i, i + batchSize)
    
    const prompt = `You are a professional translator. Translate the following text to ${targetLanguage}.${glossaryInstruction}

Translate each paragraph and return ONLY the translated text, one paragraph per line. Do not include numbering or any other text:

${batch.map((p, idx) => `Paragraph ${idx + 1}: ${p}`).join('\n\n')}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const translatedText = response.text()
    
    // Split by double newlines to get individual paragraph translations
    const translatedBatch = translatedText.split(/\n\n+/).filter(t => t.trim())
    
    translated.push(...translatedBatch)
  }

  return translated
}

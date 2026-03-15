export type LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'custom'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseUrl: string
  model: string
}

export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1', // Default to OpenRouter
  model: 'google/gemini-2.0-flash',
}

export function buildPrompt(paragraphs: string[], glossary: Record<string, string>, targetLanguage: string): string {
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

  return `You are a professional translator. Translate the following text to ${targetLanguage}.${glossaryInstruction}

Translate each paragraph and return ONLY the translated text, one paragraph per line. Do not include numbering or any other text:

${paragraphs.map((p, idx) => `Paragraph ${idx + 1}: ${p}`).join('\n\n')}`
}

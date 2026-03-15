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
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'google/gemini-2.0-flash',
}

export function buildPrompt(paragraphs: string[], glossary: Record<string, string>, targetLanguage: string): string {
  const glossaryEntries = Object.entries(glossary)
  let glossaryInstruction = ''
  
  if (glossaryEntries.length > 0) {
    const glossaryJson = JSON.stringify(Object.fromEntries(glossaryEntries))
    glossaryInstruction = `
CRITICAL - TRANSLATION GLOSSARY:
You MUST use these exact translations for these terms:
${glossaryJson}

Do NOT translate these words literally - use the glossary translations above.
`
  }

  return `You are an expert translator specializing in religious and spiritual texts.

TASK: Translate the text below from German to ${targetLanguage}.

REQUIREMENTS:
1. Maintain the original meaning and tone
2. Preserve the flow and readability
3. Keep biblical/religious terminology consistent${glossaryInstruction}
4. Output ONLY the translated text - no explanations, no numbers, no markers

Translate now:

${paragraphs.join('\n\n')}`
}

export interface TranslationUnit {
  id: string
  role: 'translate' | 'context_only'
  kind: 'paragraph' | 'heading' | 'list_item' | 'table_cell' | 'header' | 'footer' | 'footnote'
  style?: string
  text: string
  sourceLang?: string
  isLocked?: boolean
}

export interface TranslationResult {
  id: string
  text: string
}

const PLACEHOLDER_REGEX = /(https?:\/\/[^\s]+|[\w\.-]+@[\w\.-]+|\{\{[^}]+\}\}|\[%[^%]+\]%|[A-Z]{2,}[0-9]{2,}[A-Z0-9]+|verse\s*[0-9]+:[0-9]+|Ref\.\s*[A-Z0-9]+)/gi

export function lockPlaceholders(text: string): { locked: string; tokens: Map<string, string> } {
  const tokens = new Map<string, string>()
  let counter = 0
  
  const locked = text.replace(PLACEHOLDER_REGEX, (match) => {
    const token = `__LOCKED_${counter}__`
    tokens.set(token, match)
    counter++
    return token
  })
  
  return { locked, tokens }
}

export function unlockPlaceholders(text: string, tokens: Map<string, string>): string {
  let result = text
  tokens.forEach((original, token) => {
    result = result.replace(token, original)
  })
  return result
}

export function detectLanguage(text: string): { lang: string; confidence: number } {
  const germanIndicators = /\b(der|die|das|ein|eine|und|oder|aber|nicht|ist|sein|haben|werden|können|müssen|sollen|wollen|dürfen)\b/gi
  const spanishIndicators = /\b(el|la|los|las|un|una|y|o|pero|no|es|ser|estar|tener|haber|poder|deber|querer)\b/gi
  const frenchIndicators = /\b(le|la|les|un|une|et|ou|mais|ne|pas|être|avoir|pouvoir|devoir|vouloir)\b/gi
  
  const germanMatches = (text.match(germanIndicators) || []).length
  const spanishMatches = (text.match(spanishIndicators) || []).length
  const frenchMatches = (text.match(frenchIndicators) || []).length
  
  const total = germanMatches + spanishMatches + frenchMatches
  if (total === 0) return { lang: 'unknown', confidence: 0 }
  
  const max = Math.max(germanMatches, spanishMatches, frenchMatches)
  const confidence = max / total
  
  if (max === germanMatches) return { lang: 'de', confidence }
  if (max === spanishMatches) return { lang: 'es', confidence }
  return { lang: 'fr', confidence }
}

export function buildTranslationPrompt(
  units: TranslationUnit[],
  options: {
    targetLanguage: string
    sourceLanguage: string
    domain?: string
    tone?: string
    glossary?: Record<string, string>
  }
): string {
  const translateUnits = units.filter(u => u.role === 'translate')
  const contextUnits = units.filter(u => u.role === 'context_only')
  
  let glossaryRules = ''
  if (options.glossary && Object.keys(options.glossary).length > 0) {
    glossaryRules = '\nGlossary (use exactly these translations):\n'
    for (const [source, target] of Object.entries(options.glossary)) {
      glossaryRules += `  "${source}" → "${target}"\n`
    }
  }
  
  const systemPrompt = `You are a professional document translator.

TASK:
Translate document units from ${options.sourceLanguage} into ${options.targetLanguage}.

STRICT RULES:
1. Translate ALL content fully - never summarize
2. Never omit or skip any content  
3. Never merge multiple units together
4. Preserve the function of each unit: headings stay headings, list items stay list items, table cells stay concise
5. Preserve placeholders, URLs, emails, codes, citations, references, numbers, and proper nouns exactly
6. Use glossary translations exactly as provided
7. Return JSON only - no explanations, no commentary

DOMAIN: ${options.domain || 'general'}
TONE: ${options.tone || 'neutral'}
${glossaryRules}

For each unit, preserve its kind:
- heading: keep it short and as a heading
- list_item: keep it as a list item  
- table_cell: keep it concise like a table cell
- paragraph: full natural translation`

  const userPayload = units.map(u => {
    const meta = u.kind !== 'paragraph' ? ` [${u.kind}]` : ''
    return JSON.stringify({
      id: u.id,
      role: u.role,
      kind: u.kind,
      style: u.style,
      text: u.text
    })
  }).join('\n')

  return `${systemPrompt}

TRANSLATION UNITS:
${userPayload}

REQUIRED OUTPUT SCHEMA:
{
  "translations": [
    { "id": "unit_id", "text": "translated text" }
  ]
}

Translate only units with role="translate". Return valid JSON.`
}

export function parseTranslationResponse(
  response: string,
  expectedIds: string[]
): TranslationResult[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const data = JSON.parse(jsonMatch[0])
    
    if (!data.translations || !Array.isArray(data.translations)) {
      throw new Error('Invalid response format - missing translations array')
    }
    
    // Validate and map results
    const results: TranslationResult[] = []
    const receivedIds = new Set<string>()
    
    for (const t of data.translations) {
      if (!t.id || typeof t.text !== 'string') {
        throw new Error(`Invalid translation entry: ${JSON.stringify(t)}`)
      }
      results.push({ id: t.id, text: t.text })
      receivedIds.add(t.id)
    }
    
    // Check for missing IDs
    for (const expectedId of expectedIds) {
      if (!receivedIds.has(expectedId)) {
        throw new Error(`Missing translation for ID: ${expectedId}`)
      }
    }
    
    return results
  } catch (e) {
    throw new Error(`Failed to parse translation response: ${e instanceof Error ? e.message : 'Unknown error'}`)
  }
}

export function checkTranslationQuality(
  sourceUnits: TranslationUnit[],
  translations: Map<string, string>,
  glossary: Record<string, string>
): { issues: string[]; passed: boolean } {
  const issues: string[] = []
  
  for (const unit of sourceUnits) {
    if (unit.role !== 'translate') continue
    
    const source = unit.text
    const translated = translations.get(unit.id)
    
    if (!translated) {
      issues.push(`Missing translation for: ${unit.id}`)
      continue
    }
    
    if (translated.length < source.length * 0.3 && source.length > 100) {
      issues.push(`Suspiciously short translation for ${unit.id}: source=${source.length}, translated=${translated.length}`)
    }
    
    // Check for glossary compliance
    for (const [srcTerm, tgtTerm] of Object.entries(glossary)) {
      if (source.toLowerCase().includes(srcTerm.toLowerCase())) {
        if (!translated.toLowerCase().includes(tgtTerm.toLowerCase())) {
          issues.push(`Glossary violation for "${srcTerm}" in ${unit.id}`)
        }
      }
    }
  }
  
  return {
    issues,
    passed: issues.length === 0
  }
}

export function buildReviewPrompt(
  unit: TranslationUnit,
  currentTranslation: string,
  contextBefore?: string,
  contextAfter?: string,
  glossary?: Record<string, string>
): string {
  let glossaryHint = ''
  if (glossary && Object.keys(glossary).length > 0) {
    glossaryHint = '\nGlossary:\n' + Object.entries(glossary).map(([s, t]) => `  "${s}" → "${t}"`).join('\n')
  }
  
  return `You are reviewing a translation.

SOURCE:
${unit.text}

CURRENT TRANSLATION:
${currentTranslation}

CONTEXT (read only, do not modify):
${contextBefore ? `Before: ${contextBefore}` : ''}
${contextAfter ? `After: ${contextAfter}` : ''}
${glossaryHint}

PROBLEM TO FIX:
- Check for omission (anything missing from source?)
- Check for compression (too short relative to source?)
- Check for glossary violations
- Fix only this unit, do not change surrounding content

OUTPUT (JSON only):
{
  "revision": {
    "id": "${unit.id}",
    "text": "fixed translation",
    "reason": "brief explanation of what was fixed"
  }
}`
}

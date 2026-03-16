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

const PLACEHOLDER_REGEX = /(\{[^{}]+\}|\[[^\]]+\]|https?:\/\/[^\s]+|[\w\.-]+@[\w\.-]+|[A-Z]{2,}[0-9]{2,}[A-Z0-9]+|verse\s*[0-9]+:[0-9]+|Ref\.\s*[A-Z0-9]+|\+?[\d\-\(\)\s]{10,})/gi

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
  const textLower = text.toLowerCase()
  
  const germanIndicators = [
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'nicht', 'ist', 'sein', 'haben', 
    'werden', 'können', 'müssen', 'sollen', 'wollen', 'dürfen', 'wird', 'war', 'hatte', 'wurde',
    'sich', 'mit', 'für', 'von', 'zu', 'auf', 'im', 'dem', 'den', 'als', 'auch', 'es', 'an',
    'noch', 'so', 'bei', 'nur', 'aus', 'nach', 'wie', 'einem', 'einer', 'über', 'oder'
  ]
  const spanishIndicators = [
    'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'no', 'es', 'ser', 'estar', 
    'tener', 'haber', 'poder', 'deber', 'querer', 'está', 'son', 'fue', 'era', 'ha', 'han',
    'con', 'para', 'por', 'más', 'como', 'este', 'esta', 'ese', 'esa', 'los', 'las', 'su',
    'sus', 'del', 'al', 'se', 'lo', 'más', 'ya', 'muy', 'todo', 'cuando', 'donde'
  ]
  const frenchIndicators = [
    'le', 'la', 'les', 'un', 'une', 'et', 'ou', 'mais', 'ne', 'pas', 'être', 'avoir', 
    'pouvoir', 'devoir', 'vouloir', 'est', 'sont', 'était', 'était', 'a', 'ont', 'ce',
    'cette', 'ces', 'dans', 'pour', 'avec', 'sur', 'plus', 'comme', 'tout', 'nous', 'vous',
    'ils', 'elles', 'qui', 'que', 'quoi', 'dont', 'où', 'quand', 'bien', 'très', 'ici'
  ]
  const englishIndicators = [
    'the', 'and', 'or', 'but', 'not', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at',
    'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'this', 'that', 'these', 'those', 'it', 'its', 'he', 'she', 'they', 'we', 'you', 'i'
  ]
  
  const checkIndicators = (indicators: string[]) => {
    return indicators.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      return (textLower.match(regex) || []).length
    }).length
  }
  
  const germanScore = checkIndicators(germanIndicators)
  const spanishScore = checkIndicators(spanishIndicators)
  const frenchScore = checkIndicators(frenchIndicators)
  const englishScore = checkIndicators(englishIndicators)
  
  const scores = [
    { lang: 'de', score: germanScore },
    { lang: 'es', score: spanishScore },
    { lang: 'fr', score: frenchScore },
    { lang: 'en', score: englishScore },
  ]
  
  const maxScore = Math.max(germanScore, spanishScore, frenchScore, englishScore)
  
  if (maxScore === 0) return { lang: 'unknown', confidence: 0 }
  
  const total = germanScore + spanishScore + frenchScore + englishScore
  const confidence = total > 0 ? maxScore / total : 0
  
  const best = scores.find(s => s.score === maxScore)
  return { lang: best?.lang || 'unknown', confidence }
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
Translate EVERY SINGLE paragraph from ${options.sourceLanguage} into ${options.targetLanguage}.

CRITICAL RULES:
- You MUST translate ALL text - no exceptions
- Do NOT skip any word or phrase
- Do NOT copy source text verbatim - TRANSLATE IT
- Do NOT merge paragraphs together  
- Do NOT summarize - translate fully
- EVERY word in the output must be in ${options.targetLanguage}
- If you see German words, translate them to Spanish

WARNING: Copying source language text without translation is FAILURE.

DOMAIN: ${options.domain || 'general'}
TONE: ${options.tone || 'neutral'}
${glossaryRules}`

  // List all IDs that MUST be translated
  const requiredIds = translateUnits.map(u => u.id).join(', ')

  const userPayload = units.map(u => JSON.stringify({
    id: u.id,
    role: u.role,
    text: u.text
  })).join('\n')

  return `${systemPrompt}

MUST TRANSLATE THESE IDS: ${requiredIds}

TRANSLATION UNITS:
${userPayload}

OUTPUT SCHEMA (MUST include ALL IDs):
{
  "translations": [
    { "id": "u_0000", "text": "..." },
    { "id": "u_0001", "text": "..." }
  ]
}

Every ID in "MUST TRANSLATE THESE IDS" must appear in the output!`
}

export function parseTranslationResponse(
  response: string,
  expectedIds: string[]
): TranslationResult[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const data = JSON.parse(jsonMatch[0])
    
    if (!data.translations || !Array.isArray(data.translations)) {
      throw new Error('Invalid response format - missing translations array')
    }
    
    const results: TranslationResult[] = []
    const receivedIds = new Set<string>()
    
    for (const t of data.translations) {
      if (!t.id || typeof t.text !== 'string') {
        continue // Skip invalid entries
      }
      results.push({ id: t.id, text: t.text })
      receivedIds.add(t.id)
    }
    
    // Check for missing IDs and warn (but continue)
    const missing = expectedIds.filter(id => !receivedIds.has(id))
    if (missing.length > 0) {
      console.warn(`Missing translations for IDs: ${missing.join(', ')}`)
      // Fill in missing with source text as fallback
      for (const id of missing) {
        results.push({ id, text: `[MISSING: ${id}]` })
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
  
  // Common German words that should NOT appear in Spanish translations
  const germanWordPattern = /\b(der|die|das|ein|eine|und|oder|aber|nicht|ist|sein|haben|werden|können|müssen|sollen|wollen|dürfen|mit|von|auf|für|zu|als|bei|aus|nach|um|an|im|am|um|des|dem|den|eing|aus|über|unter|vor|hinter|zwischen|durch|ohne|gegen|um|auch|noch|schon|sehr|gut|biss|alles|nichts|etwas|jeder|dieser|jener|alle|einige|wenige|viele|andere|neue|alt|groß|klein|lang|kurz|neu|alt|erste|letzte|allein|immer|nie|heute|morgen|gestern|jetzt|damals|nun|da|wo|wie|warum|weil|damit|obwohl|ob|wenn|falls|sonst|bis|seit|während|bevor|nachdem|weil|denn|doch|ja|nein|freilich|gewiß|leider|zwar|etwa|gar|nur|bloß|eben|halt|genau|besonders|ziemlich|sehr|recht|ganz|fast|kaum|kaum|fast|etwa|ungefähr|circa|ca)\b/gi
  
  for (const unit of sourceUnits) {
    if (unit.role !== 'translate') continue
    
    const source = unit.text
    const translated = translations.get(unit.id)
    
    if (!translated) {
      issues.push(`Missing translation for: ${unit.id}`)
      continue
    }
    
    // Check for suspiciously short translations
    if (translated.length < source.length * 0.3 && source.length > 100) {
      issues.push(`Suspiciously short translation for ${unit.id}: source=${source.length}, translated=${translated.length}`)
    }
    
    // Check for German words in translation (indicates incomplete translation)
    const germanMatches = translated.match(germanWordPattern)
    if (germanMatches && germanMatches.length > 0) {
      // Filter out false positives (words that are valid in both languages)
      const uniqueGerman = [...new Set(germanMatches.map(w => w.toLowerCase()))]
      // Filter out common false positives
      const falsePositives = ['uno', 'una', 'sobre', 'para', 'sin', 'mas', 'muy', 'todo', 'este', 'ese', 'cada', 'como', 'cuando', 'donde', 'porque', 'aunque', 'pero', 'que', 'cual', 'quien']
      const realGerman = uniqueGerman.filter(w => !falsePositives.includes(w))
      
      if (realGerman.length > 0) {
        issues.push(`Possible incomplete translation (German words detected) for ${unit.id}: ${realGerman.join(', ')}`)
      }
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

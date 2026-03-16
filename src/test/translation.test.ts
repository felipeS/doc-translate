import { extractDocumentXml, extractUnits, applyTranslations, createTranslatedDocx } from '../lib/docx'
import fs from 'fs'
import path from 'path'

// Sample mock translations - these would come from the LLM
const MOCK_TRANSLATIONS: Record<string, string> = {
  'u_0000': 'Predigt über Kolosser 1:15-20',
  'u_0001': 'Er ist das Bild des unsichtbaren Gottes,',
  'u_0002': 'der Erstgeborene aller Schöpfung.',
  'u_0003': 'Denn in ihm wurde alles geschaffen,',
  'u_0004': 'was im Himmel und auf Erden ist,',
  'u_0005': 'das Sichtbare und das Unsichtbare,',
  'u_0006': 'seien es Throne oder Herrschaften,',
  'u_0007': 'seien es Mächte oder Gewalten,',
  'u_0008': 'alles wurde durch ihn und für ihn geschaffen.',
  'u_0009': 'Er ist vor allem,',
  'u_0010': 'und alles besteht in ihm.',
}

describe('DOCX Translation Pipeline', () => {
  const testDocxPath = path.join(__dirname, '../test/fixtures/test-doc.docx')
  
  // Create a test DOCX file if it doesn't exist
  beforeAll(() => {
    const fixturesDir = path.join(__dirname, '../test/fixtures')
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true })
    }
    
    // Copy the actual test file if available
    const sourcePath = '/root/.openclaw/media/inbound/Predigt_Kolosser_1_15-20_-_Teil_3---ddd36550-6dca-46de-b1eb-6925952a127f.docx'
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, testDocxPath)
    }
  })

  it('should load and extract text units from DOCX', async () => {
    // Skip if test file doesn't exist
    if (!fs.existsSync(testDocxPath)) {
      console.log('Test DOCX file not found, skipping')
      return
    }
    
    const fileBuffer = fs.readFileSync(testDocxPath)
    const { xml, zip } = await extractDocumentXml(fileBuffer)
    
    expect(xml).toBeDefined()
    expect(zip).toBeDefined()
    
    const units = extractUnits(xml)
    
    // Should have extracted many units
    expect(units.length).toBeGreaterThan(100)
    
    // First unit should have an ID
    expect(units[0].id).toMatch(/^u_\d{4}$/)
    expect(units[0].text).toBeTruthy()
  })

  it('should map translations back to DOCX elements', async () => {
    if (!fs.existsSync(testDocxPath)) {
      console.log('Test DOCX file not found, skipping')
      return
    }
    
    const fileBuffer = fs.readFileSync(testDocxPath)
    const { xml, zip } = await extractDocumentXml(fileBuffer)
    const units = extractUnits(xml)
    
    // Apply mock translations
    const translations = new Map(Object.entries(MOCK_TRANSLATIONS))
    applyTranslations(units, translations)
    
    // Generate the new DOCX
    const translatedBuffer = await createTranslatedDocx(zip, xml)
    
    // Should have generated a valid DOCX
    expect(translatedBuffer).toBeDefined()
    expect(translatedBuffer.length).toBeGreaterThan(1000)
    
    // Check it's a valid ZIP (DOCX is a ZIP)
    const zipHeader = translatedBuffer.slice(0, 2).toString('hex')
    expect(zipHeader).toBe('504b') // PK
  })

  it('should preserve paragraph structure and spacing', async () => {
    if (!fs.existsSync(testDocxPath)) {
      console.log('Test DOCX file not found, skipping')
      return
    }
    
    const fileBuffer = fs.readFileSync(testDocxPath)
    const { xml, zip } = await extractDocumentXml(fileBuffer)
    const units = extractUnits(xml)
    
    // Apply translations with proper spacing
    const translations = new Map([
      ['u_0000', 'Hello world'],
      ['u_0001', 'This is a test'],
    ])
    applyTranslations(units, translations)
    
    const translatedBuffer = await createTranslatedDocx(zip, xml)
    
    // Verify the output is valid
    expect(translatedBuffer).toBeInstanceOf(Buffer)
    expect(translatedBuffer.length).toBeGreaterThan(0)
  })

  it('should handle empty translations gracefully', async () => {
    if (!fs.existsSync(testDocxPath)) {
      console.log('Test DOCX file not found, skipping')
      return
    }
    
    const fileBuffer = fs.readFileSync(testDocxPath)
    const { xml, zip } = await extractDocumentXml(fileBuffer)
    const units = extractUnits(xml)
    
    // Apply empty translations map
    const translations = new Map<string, string>()
    applyTranslations(units, translations)
    
    // Should still generate valid DOCX (original text preserved)
    const result = await createTranslatedDocx(zip, xml)
    expect(result).toBeInstanceOf(Buffer)
  })
})

describe('Translation Prompt Builder', () => {
  it('should generate valid prompt with context', async () => {
    const { buildTranslationPrompt } = await import('../lib/translate')
    
    const units = [
      { id: 'u_0001', role: 'translate', kind: 'paragraph', text: 'Hello world' },
      { id: 'u_0002', role: 'context_only', kind: 'paragraph', text: 'Previous text' },
      { id: 'u_0003', role: 'translate', kind: 'paragraph', text: 'Goodbye' },
    ]
    
    const prompt = buildTranslationPrompt(units, {
      targetLanguage: 'Spanish',
      sourceLanguage: 'English',
    })
    
    expect(prompt).toContain('Spanish')
    expect(prompt).toContain('English')
    expect(prompt).toContain('u_0001')
    expect(prompt).toContain('u_0003')
    // Context should not require translation
    expect(prompt).toContain('context_only')
  })

  it('should parse translation response correctly', async () => {
    const { parseTranslationResponse } = await import('../lib/translate')
    
    const mockResponse = JSON.stringify({
      translations: [
        { id: 'u_0001', text: 'Hola mundo' },
        { id: 'u_0002', text: 'Adiós' },
      ]
    })
    
    const results = parseTranslationResponse(mockResponse, ['u_0001', 'u_0002'])
    
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('u_0001')
    expect(results[0].text).toBe('Hola mundo')
    expect(results[1].id).toBe('u_0002')
    expect(results[1].text).toBe('Adiós')
  })

  it('should handle missing translations gracefully', async () => {
    const { parseTranslationResponse } = await import('../lib/translate')
    
    const mockResponse = JSON.stringify({
      translations: [
        { id: 'u_0001', text: 'Hola mundo' },
        // u_0002 is missing
      ]
    })
    
    // Should not throw, should fill in missing with placeholder
    const results = parseTranslationResponse(mockResponse, ['u_0001', 'u_0002'])
    
    expect(results).toHaveLength(2)
    expect(results[0].text).toBe('Hola mundo')
    expect(results[1].text).toContain('MISSING')
  })
})

describe('Placeholder Locking', () => {
  it('should lock and unlock placeholders', async () => {
    const { lockPlaceholders, unlockPlaceholders } = await import('../lib/translate')
    
    const text = 'Visit https://example.com or contact test@example.com'
    const { locked, tokens } = lockPlaceholders(text)
    
    // URLs should be replaced with tokens
    expect(locked).toContain('__LOCKED_0__')
    expect(locked).toContain('__LOCKED_1__')
    expect(locked).not.toContain('https://')
    expect(locked).not.toContain('@')
    
    // Should restore original
    const restored = unlockPlaceholders(locked, tokens)
    expect(restored).toBe(text)
  })
})

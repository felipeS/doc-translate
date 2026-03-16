import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

export interface DocxUnit {
  id: string
  index: number
  text: string
  // Store ALL text elements in this paragraph (not just one)
  elements: Element[]
  // Track parent paragraph to group text nodes
  paragraphId: string
}

export async function extractDocumentXml(fileBuffer: Buffer): Promise<{ xml: Document, zip: JSZip }> {
  const zip = await JSZip.loadAsync(fileBuffer)
  const docXml = await zip.file('word/document.xml')?.async('string')
  
  if (!docXml) {
    throw new Error('Could not find word/document.xml in the DOCX file')
  }

  const parser = new DOMParser()
  const xml = parser.parseFromString(docXml, 'text/xml')
  
  return { xml, zip }
}

export function extractUnits(xml: Document): DocxUnit[] {
  // Get all paragraphs
  const paragraphs = xml.getElementsByTagName('w:p')
  if (paragraphs.length === 0) {
    console.log('No paragraphs found')
    return []
  }
  
  console.log(`Found ${paragraphs.length} paragraphs`)
  
  const units: DocxUnit[] = []
  
  for (let paraIndex = 0; paraIndex < paragraphs.length; paraIndex++) {
    const paragraph = paragraphs[paraIndex]
    
    // Get all text nodes within this paragraph
    const textNodes = paragraph.getElementsByTagName('w:t')
    
    if (textNodes.length === 0) continue
    
    // Concatenate all text in this paragraph
    let fullText = ''
    const elements: Element[] = []
    
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i]
      const text = node.textContent || ''
      if (text.trim()) {
        // Preserve spacing between text nodes
        if (fullText && !fullText.endsWith(' ') && !text.startsWith(' ')) {
          fullText += ' '
        }
        fullText += text.trim()
        elements.push(node)
      }
    }
    
    if (!fullText.trim()) continue
    
    // Get paragraph ID
    const paragraphId = paragraph.getAttribute('w:14:paraId') || paragraph.getAttribute('w14:paraId') || `para_${paraIndex}`
    
    units.push({
      id: `u_${String(paraIndex).padStart(4, '0')}`,
      index: paraIndex,
      text: fullText.trim(),
      elements, // Store all text elements
      paragraphId
    })
  }
  
  console.log(`Extracted ${units.length} translation units (one per paragraph)`)
  return units
}

export function applyTranslations(units: DocxUnit[], translations: Map<string, string>): void {
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    const translated = translations.get(unit.id)
    
    if (translated && unit.elements.length > 0) {
      // Split translated text back into original text nodes
      // We need to distribute the translation across the original elements
      
      // Get original text parts (what was in each element)
      const originalParts: string[] = []
      for (const el of unit.elements) {
        const text = el.textContent?.trim() || ''
        if (text) originalParts.push(text)
      }
      
      if (originalParts.length === 1) {
        // Simple case: one element, just set the translation
        unit.elements[0].textContent = translated
      } else {
        // Multiple elements: need to distribute translation
        // This is tricky - for now, put full translation in first element
        // and clear the rest (or we could use a smarter distribution)
        
        // Simple approach: put translation in first element, clear others
        unit.elements[0].textContent = translated
        for (let j = 1; j < unit.elements.length; j++) {
          unit.elements[j].textContent = ''
        }
      }
    }
  }
}

export async function createTranslatedDocx(zip: JSZip, xml: Document): Promise<Buffer> {
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(xml)
  
  zip.file('word/document.xml', xmlString)
  
  return await zip.generateAsync({ type: 'nodebuffer' })
}

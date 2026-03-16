import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

export interface DocxUnit {
  id: string
  index: number
  text: string
  element: Element
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
  const units: DocxUnit[] = []
  
  // Get all text nodes
  let textNodes = xml.getElementsByTagName('w:t')
  if (textNodes.length === 0) {
    textNodes = xml.getElementsByTagName('t')
  }
  
  if (textNodes.length === 0) {
    console.log('No text nodes found')
    return units
  }
  
  console.log(`Found ${textNodes.length} text nodes`)
  
  let unitIndex = 0
  let lastParagraphId = ''
  
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const text = node.textContent || ''
    
    if (!text.trim()) continue
    
    // Find parent paragraph
    let parent = node.parentNode
    let paragraphId = ''
    
    while (parent) {
      if ((parent as Element).tagName === 'w:p' || (parent as Element).tagName === 'p') {
        paragraphId = (parent as Element).getAttribute('w:14paraId') || (parent as Element).getAttribute('xml:id') || `para_${i}`
        break
      }
      parent = parent.parentNode
    }
    
    // Mark if this is a new paragraph
    const isNewParagraph = paragraphId !== lastParagraphId && lastParagraphId !== ''
    lastParagraphId = paragraphId
    
    units.push({
      id: `u_${String(unitIndex).padStart(4, '0')}`,
      index: unitIndex,
      text: text.trim(),
      element: node,
      paragraphId
    })
    unitIndex++
  }
  
  console.log(`Extracted ${units.length} translation units`)
  return units
}

export function applyTranslations(units: DocxUnit[], translations: Map<string, string>): void {
  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    const translated = translations.get(unit.id)
    
    if (translated) {
      // Check if there's a next unit in the same paragraph
      let needsSpaceAfter = false
      if (i + 1 < units.length) {
        const nextUnit = units[i + 1]
        // If same paragraph and next unit doesn't start with space
        if (nextUnit.paragraphId === unit.paragraphId && 
            nextUnit.text && 
            !nextUnit.text.startsWith(' ') &&
            !translated.endsWith(' ')) {
          needsSpaceAfter = true
        }
      }
      
      // Apply translation with trailing space if needed
      unit.element.textContent = needsSpaceAfter ? translated + ' ' : translated
    }
  }
}

export async function createTranslatedDocx(zip: JSZip, xml: Document): Promise<Buffer> {
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(xml)
  
  zip.file('word/document.xml', xmlString)
  
  return await zip.generateAsync({ type: 'nodebuffer' })
}

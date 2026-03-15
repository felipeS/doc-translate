import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

export interface DocxUnit {
  id: string
  index: number
  text: string
  element: Element  // Direct reference to the w:t element
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
  
  // Get all text nodes in document order
  let textNodes = xml.getElementsByTagName('w:t')
  if (textNodes.length === 0) {
    textNodes = xml.getElementsByTagName('t')
  }
  
  if (textNodes.length === 0) {
    console.log('No text nodes found')
    return units
  }
  
  console.log(`Found ${textNodes.length} text nodes`)
  
  // Each non-empty text node is a translation unit
  let unitIndex = 0
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const text = node.textContent || ''
    
    if (text.trim()) {
      units.push({
        id: `u_${String(unitIndex).padStart(4, '0')}`,
        index: unitIndex,
        text: text.trim(),
        element: node
      })
      unitIndex++
    }
  }
  
  console.log(`Extracted ${units.length} translation units`)
  return units
}

export function applyTranslations(units: DocxUnit[], translations: Map<string, string>): void {
  for (const unit of units) {
    const translated = translations.get(unit.id)
    
    if (translated) {
      // Direct replacement
      unit.element.textContent = translated
    }
  }
}

export async function createTranslatedDocx(zip: JSZip, xml: Document): Promise<Buffer> {
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(xml)
  
  zip.file('word/document.xml', xmlString)
  
  return await zip.generateAsync({ type: 'nodebuffer' })
}

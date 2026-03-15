import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

export interface DocxUnit {
  id: string
  part: string
  index: number
  text: string
  style?: string
  kind: 'paragraph' | 'heading' | 'list_item' | 'table_cell' | 'header' | 'footer' | 'footnote'
  listLevel?: number
  elements: Element[]
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
  
  // Simple approach: iterate in document order and group by paragraph
  const seenParagraphs = new Set<Element>()
  let unitIndex = 0
  
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const text = node.textContent || ''
    if (!text.trim()) continue
    
    // Find the paragraph this text node belongs to
    let parent = node.parentNode
    let paraElement: Element | null = null
    
    while (parent) {
      const tagName = (parent as Element).tagName || ''
      if (tagName === 'w:p' || tagName === 'p') {
        paraElement = parent as Element
        break
      }
      parent = parent.parentNode
    }
    
    if (!paraElement || seenParagraphs.has(paraElement)) continue
    seenParagraphs.add(paraElement)
    
    // Collect all text nodes in this paragraph
    const paraTextNodes = paraElement.getElementsByTagName('w:t')
    const allParaTexts: string[] = []
    const paraElements: Element[] = []
    
    for (let j = 0; j < paraTextNodes.length; j++) {
      const tNode = paraTextNodes[j]
      const tText = tNode.textContent || ''
      if (tText.trim()) {
        allParaTexts.push(tText.trim())
        paraElements.push(tNode)
      }
    }
    
    if (allParaTexts.length === 0) continue
    
    // Determine kind
    let kind: DocxUnit['kind'] = 'paragraph'
    let style: string | undefined
    let listLevel: number | undefined
    
    const pPr = paraElement.getElementsByTagName('w:pPr')[0]
    if (pPr) {
      const pStyle = pPr.getElementsByTagName('w:pStyle')[0]
      if (pStyle) {
        style = pStyle.getAttribute('w:val') || undefined
        if (style && (style.toLowerCase().includes('heading') || style.match(/^Heading/))) {
          kind = 'heading'
        }
      }
      
      const listPr = pPr.getElementsByTagName('w:listPr')[0]
      if (listPr) {
        kind = 'list_item'
        const ilvl = listPr.getElementsByTagName('w:ilvl')[0]
        if (ilvl) {
          listLevel = parseInt(ilvl.getAttribute('w:val') || '0') + 1
        }
      }
    }
    
    // Check if in table
    let current = paraElement.parentNode
    while (current) {
      if ((current as Element).tagName === 'w:tc' || (current as Element).tagName === 'tc') {
        kind = 'table_cell'
        break
      }
      current = current.parentNode
    }
    
    units.push({
      id: `u_${String(unitIndex).padStart(4, '0')}`,
      part: 'body',
      index: unitIndex,
      text: allParaTexts.join(''),
      style,
      kind,
      listLevel,
      elements: paraElements
    })
    
    unitIndex++
  }
  
  console.log(`Extracted ${units.length} translation units`)
  return units
}

export function applyTranslations(units: DocxUnit[], translations: Map<string, string>): void {
  for (const unit of units) {
    const translated = translations.get(unit.id)
    
    if (translated && unit.elements.length > 0) {
      let currentPos = 0
      
      for (const element of unit.elements) {
        const originalLen = element.textContent?.length || 0
        
        if (currentPos < translated.length) {
          const remaining = translated.length - currentPos
          const textToUse = translated.substring(currentPos, currentPos + Math.min(originalLen, remaining))
          element.textContent = textToUse
          currentPos += textToUse.length
        } else {
          element.textContent = ''
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

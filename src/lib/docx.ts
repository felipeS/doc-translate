import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

export interface DocxUnit {
  id: string
  part: string  // body, header, footer, footnotes
  index: number
  text: string
  style?: string
  kind: 'paragraph' | 'heading' | 'list_item' | 'table_cell' | 'header' | 'footer' | 'footnote'
  listLevel?: number
  tableRow?: number
  tableCell?: number
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
  
  // Group text nodes by their paragraph
  const paragraphMap = new Map<string, { element: Element; texts: string[]; style?: string; kind: string; listLevel?: number }>()
  
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const text = node.textContent || ''
    if (!text.trim()) continue
    
    // Find paragraph element
    let parent = node.parentNode as Element
    let paraElement: Element | null = null
    let current: Element | null = parent
    
    while (current) {
      const tagName = current.tagName || ''
      if (tagName === 'w:p' || tagName === 'p') {
        paraElement = current
        break
      }
      current = current.parentNode as Element
    }
    
    if (!paraElement) continue
    
    // Get unique ID for paragraph
    const paraId = paraElement.getAttribute('xml:id') || paraElement.getAttribute('w14:paraId') || `para_${paragraphMap.size}`
    
    // Determine kind and style
    let kind: string = 'paragraph'
    let style: string | undefined
    let listLevel: number | undefined
    
    // Check for heading
    const pPr = paraElement.getElementsByTagName('w:pPr')[0]
    if (pPr) {
      const pStyle = pPr.getElementsByTagName('w:pStyle')[0]
      if (pStyle) {
        const styleVal = pStyle.getAttribute('w:val')
        if (styleVal) {
          style = styleVal
          if (styleVal.toLowerCase().includes('heading') || styleVal.match(/^Heading[0-9]/)) {
            kind = 'heading'
          }
        }
      }
      
      // Check for list item
      const listPr = pPr.getElementsByTagName('w:listPr')[0]
      if (listPr) {
        kind = 'list_item'
        const ilvl = listPr.getElementsByTagName('w:ilvl')[0]
        if (ilvl) {
          const ilvlVal = ilvl.getAttribute('w:val')
          if (ilvlVal) {
            listLevel = parseInt(ilvlVal) + 1
          }
        }
      }
    }
    
    // Check for table cell
    let inTable = false
    let tableRow = 0
    let tableCell = 0
    current = paraElement.parentNode as Element
    while (current) {
      const tagName = current.tagName || ''
      if (tagName === 'w:tr' || tagName === 'tr') {
        const trId = current.getAttribute('xml:id') || `row_${tableRow}`
        tableRow = paragraphMap.size // Approximate
        break
      }
      if (tagName === 'w:tc' || tagName === 'tc') {
        inTable = true
        break
      }
      current = current.parentNode as Element
    }
    if (inTable) {
      kind = 'table_cell'
    }
    
    if (paragraphMap.has(paraId)) {
      const existing = paragraphMap.get(paraId)!
      existing.texts.push(text)
    } else {
      paragraphMap.set(paraId, {
        element: paraElement,
        texts: [text],
        style,
        kind,
        listLevel
      })
    }
  }
  
  // Convert to units
  let index = 0
  paragraphMap.forEach((data, id) => {
    const text = data.texts.join('')
    if (text.trim()) {
      units.push({
        id: `u_${String(index).padStart(3, '0')}`,
        part: 'body',
        index: index,
        text: text.trim(),
        style: data.style,
        kind: data.kind as DocxUnit['kind'],
        listLevel: data.listLevel
      })
      index++
    }
  })
  
  console.log(`Extracted ${units.length} translation units`)
  return units
}

export function applyTranslations(xml: Document, translations: Map<string, string>): void {
  // Get all text nodes
  let textNodes = xml.getElementsByTagName('w:t')
  if (textNodes.length === 0) {
    textNodes = xml.getElementsByTagName('t')
  }
  
  // Group by paragraph
  const paragraphNodes = new Map<string, Element[]>()
  
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i] as Element
    const text = node.textContent || ''
    if (!text.trim()) continue
    
    let parent = node.parentNode as Element
    let paraId = ''
    
    while (parent) {
      const tagName = parent.tagName || ''
      if (tagName === 'w:p' || tagName === 'p') {
        paraId = parent.getAttribute('xml:id') || parent.getAttribute('w14:paraId') || `para_${paragraphNodes.size}`
        break
      }
      parent = parent.parentNode as Element
    }
    
    if (paraId) {
      const nodes = paragraphNodes.get(paraId) || []
      nodes.push(node)
      paragraphNodes.set(paraId, nodes)
    }
  }
  
  // Find matching translations
  const unitEntries = Array.from(paragraphNodes.entries())
  
  // This is a simplified mapping - in production you'd track exact IDs
  let unitIndex = 0
  paragraphNodes.forEach((nodes, paraId) => {
    const translatedText = translations.get(`u_${String(unitIndex).padStart(3, '0')}`)
    
    if (translatedText) {
      // Distribute translated text across nodes
      let currentPos = 0
      const originalText = nodes.map(n => n.textContent || '').join('')
      
      for (const node of nodes) {
        const nodeLen = node.textContent?.length || 0
        if (currentPos < translatedText.length) {
          const remaining = translatedText.length - currentPos
          const textToUse = translatedText.substring(currentPos, currentPos + Math.min(nodeLen, remaining))
          node.textContent = textToUse
          currentPos += textToUse.length
        } else {
          node.textContent = ''
        }
      }
    }
    unitIndex++
  })
}

export async function createTranslatedDocx(zip: JSZip, xml: Document): Promise<Buffer> {
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(xml)
  
  zip.file('word/document.xml', xmlString)
  
  return await zip.generateAsync({ type: 'nodebuffer' })
}

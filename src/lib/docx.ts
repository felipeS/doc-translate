import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

export interface Paragraph {
  index: number
  text: string
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

export function extractParagraphs(xml: Document): Paragraph[] {
  const paragraphs: Paragraph[] = []
  
  // Try different namespace formats
  let textNodes = xml.getElementsByTagName('w:t')
  if (textNodes.length === 0) {
    textNodes = xml.getElementsByTagName('t')
  }
  
  if (textNodes.length === 0) {
    // Debug: log the XML structure
    console.log('No text nodes found. XML content:', xml.documentElement.innerHTML.substring(0, 500))
    return paragraphs
  }
  
  console.log(`Found ${textNodes.length} text nodes`)

  // Group text nodes by their paragraph parent
  const paragraphMap = new Map<Element, string>()

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const text = node.textContent || ''
    
    // Find the paragraph element (w:p)
    let parent = node.parentElement
    while (parent && parent.tagName !== 'w:p' && parent.tagName !== 'p') {
      parent = parent.parentElement
    }
    
    if (parent) {
      const existing = paragraphMap.get(parent) || ''
      paragraphMap.set(parent, existing + text)
    }
  }

  // Convert map to paragraphs array
  let index = 0
  paragraphMap.forEach((text) => {
    if (text.trim()) {
      paragraphs.push({ index, text: text.trim() })
      index++
    }
  })

  console.log(`Extracted ${paragraphs.length} paragraphs`)
  return paragraphs
}

export function translateParagraphsXml(xml: Document, translatedTexts: string[]): void {
  // Get all w:t elements
  let textNodes = xml.getElementsByTagName('w:t')
  if (textNodes.length === 0) {
    textNodes = xml.getElementsByTagName('t')
  }

  // Group by paragraph
  const paragraphNodes = new Map<Element, Element[]>()

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i] as Element
    let parent = node.parentElement
    while (parent && parent.tagName !== 'w:p' && parent.tagName !== 'p') {
      parent = parent.parentElement
    }
    
    if (parent) {
      const nodes = paragraphNodes.get(parent) || []
      nodes.push(node)
      paragraphNodes.set(parent, nodes)
    }
  }

  // Apply translations
  let paraIndex = 0
  paragraphNodes.forEach((nodes) => {
    if (paraIndex < translatedTexts.length) {
      const translated = translatedTexts[paraIndex]
      
      // Distribute translated text across the text nodes
      let currentPos = 0
      const originalText = nodes.map(n => n.textContent || '').join('')
      
      for (const node of nodes) {
        const nodeLen = node.textContent?.length || 0
        if (currentPos < translated.length) {
          const remaining = translated.length - currentPos
          const textToUse = translated.substring(currentPos, currentPos + Math.min(nodeLen, remaining))
          node.textContent = textToUse
          currentPos += textToUse.length
        } else {
          node.textContent = ''
        }
      }
    }
    paraIndex++
  })
}

export async function createTranslatedDocx(zip: JSZip, xml: Document): Promise<Buffer> {
  const serializer = new XMLSerializer()
  const xmlString = serializer.serializeToString(xml)
  
  zip.file('word/document.xml', xmlString)
  
  return await zip.generateAsync({ type: 'nodebuffer' })
}

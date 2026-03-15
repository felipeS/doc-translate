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
  
  // Get all text nodes - try multiple tag names
  let textNodes = xml.getElementsByTagName('w:t')
  
  // If no namespaced elements, try without namespace
  if (textNodes.length === 0) {
    textNodes = xml.getElementsByTagName('t')
  }
  
  // Also try getElementsByTagNameNS
  if (textNodes.length === 0) {
    try {
      textNodes = xml.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't')
    } catch (e) {
      // Some implementations don't support this
    }
  }
  
  if (textNodes.length === 0) {
    console.log('No text nodes found')
    return paragraphs
  }
  
  console.log(`Found ${textNodes.length} text nodes`)

  // Group text nodes by their paragraph (w:p) parent
  // Walk up the tree to find the paragraph element
  const paragraphTexts = new Map<string, string>()

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const text = node.textContent || ''
    
    // Find paragraph by walking up
    let parent = node.parentNode as Element
    let paraId = ''
    
    while (parent) {
      const tagName = parent.tagName || ''
      // Check for paragraph (with or without namespace)
      if (tagName === 'w:p' || tagName === 'p' || tagName.endsWith(':p')) {
        // Use the outer HTML as a unique key for this paragraph
        paraId = parent.getAttribute('xml:id') || parent.getAttribute('w:id') || `para_${i}`
        break
      }
      parent = parent.parentNode as Element
    }
    
    if (paraId) {
      const existing = paragraphTexts.get(paraId) || ''
      paragraphTexts.set(paraId, existing + text)
    }
  }

  // Convert to array
  let index = 0
  paragraphTexts.forEach((text) => {
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

  // Group text nodes by paragraph
  const paragraphNodes = new Map<string, Element[]>()

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i] as Element
    let parent = node.parentNode as Element
    let paraId = ''
    
    while (parent) {
      const tagName = parent.tagName || ''
      if (tagName === 'w:p' || tagName === 'p' || tagName.endsWith(':p')) {
        paraId = parent.getAttribute('xml:id') || parent.getAttribute('w:id') || `para_${i}`
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

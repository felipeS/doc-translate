import JSZip from 'jszip'
import { XMLSerializer } from '@xmldom/xmldom'

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
  const textNodes = xml.getElementsByTagName('w:t')
  
  let currentParagraphText = ''
  let currentParagraphIndex = 0
  let lastParent: Element | null = null

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]
    const parent = node.parentElement
    
    if (!parent) continue
    
    // New paragraph if parent changed
    if (lastParent && parent !== lastParent) {
      if (currentParagraphText.trim()) {
        paragraphs.push({
          index: currentParagraphIndex,
          text: currentParagraphText.trim()
        })
        currentParagraphIndex++
      }
      currentParagraphText = ''
    }
    
    currentParagraphText += node.textContent || ''
    lastParent = parent
  }
  
  // Don't forget the last paragraph
  if (currentParagraphText.trim()) {
    paragraphs.push({
      index: currentParagraphIndex,
      text: currentParagraphText.trim()
    })
  }
  
  return paragraphs
}

export function translateParagraphsXml(xml: Document, translatedTexts: string[]): void {
  const textNodes = xml.getElementsByTagName('w:t')
  
  let currentParagraphIndex = 0
  let currentParagraphText = ''
  let lastParent: Element | null = null
  
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i] as Element
    const parent = node.parentElement
    
    if (!parent) continue
    
    // New paragraph if parent changed
    if (lastParent && parent !== lastParent) {
      if (currentParagraphIndex < translatedTexts.length) {
        // Replace the entire paragraph text
        const newText = translatedTexts[currentParagraphIndex]
        
        // Find all text nodes in this paragraph and rebuild
        const paragraph = parent.parentElement
        if (paragraph) {
          // Simple replacement: just replace the content of all w:t elements in this paragraph
          const paraTextNodes = paragraph.getElementsByTagName('w:t')
          let textIndex = 0
          const originalText = currentParagraphText
          
          for (let j = 0; j < paraTextNodes.length; j++) {
            const textNode = paraTextNodes[j] as Element
            const textContent = textNode.textContent || ''
            const textLen = textContent.length
            
            if (textIndex + textLen <= originalText.length) {
              const portion = newText.substring(textIndex, textIndex + textLen)
              textNode.textContent = portion
              textIndex += textLen
            }
          }
        }
      }
      currentParagraphIndex++
      currentParagraphText = ''
    }
    
    currentParagraphText += node.textContent || ''
    lastParent = parent
  }
  
  // Handle last paragraph
  if (currentParagraphText.trim() && currentParagraphIndex < translatedTexts.length) {
    const newText = translatedTexts[currentParagraphIndex]
    if (lastParent) {
      const paragraph = lastParent.parentElement
      if (paragraph) {
        const paraTextNodes = paragraph.getElementsByTagName('w:t')
        let textIndex = 0
        const originalText = currentParagraphText
        
        for (let j = 0; j < paraTextNodes.length; j++) {
          const textNode = paraTextNodes[j] as Element
          const textContent = textNode.textContent || ''
          const textLen = textContent.length
          
          if (textIndex + textLen <= originalText.length) {
            const portion = newText.substring(textIndex, textIndex + textLen)
            textNode.textContent = portion
            textIndex += textLen
          }
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

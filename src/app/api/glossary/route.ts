import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GLOSSARY_FILE = path.join(process.cwd(), 'glossary.json')

function getGlossary(): { source: string; target: string }[] {
  try {
    if (fs.existsSync(GLOSSARY_FILE)) {
      const data = fs.readFileSync(GLOSSARY_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('Error reading glossary:', e)
  }
  return []
}

function saveGlossary(terms: { source: string; target: string }[]): void {
  fs.writeFileSync(GLOSSARY_FILE, JSON.stringify(terms, null, 2))
}

export async function GET() {
  try {
    const terms = getGlossary()
    return NextResponse.json(terms)
  } catch (error) {
    console.error('Error fetching glossary:', error)
    return NextResponse.json({ error: 'Failed to fetch glossary' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { source, target } = await request.json()

    if (!source || !target) {
      return NextResponse.json({ error: 'Source and target are required' }, { status: 400 })
    }

    const terms = getGlossary()
    const newTerm = { source, target }
    terms.push(newTerm)
    saveGlossary(terms)

    return NextResponse.json(newTerm)
  } catch (error) {
    console.error('Error creating term:', error)
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const terms = getGlossary()
    const index = parseInt(id)
    
    if (index >= 0 && index < terms.length) {
      terms.splice(index, 1)
      saveGlossary(terms)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting term:', error)
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 })
  }
}

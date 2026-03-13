import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const terms = await prisma.glossaryTerm.findMany({
      orderBy: { createdAt: 'desc' },
    })
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

    const term = await prisma.glossaryTerm.create({
      data: { source, target },
    })

    return NextResponse.json(term)
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

    await prisma.glossaryTerm.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting term:', error)
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 })
  }
}

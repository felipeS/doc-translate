import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: 'default' },
      })
    }

    return NextResponse.json({
      apiKey: settings.apiKey,
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json()

    const settings = await prisma.settings.upsert({
      where: { id: 'default' },
      update: { apiKey },
      create: { id: 'default', apiKey },
    })

    return NextResponse.json({ success: true, apiKey: settings.apiKey })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

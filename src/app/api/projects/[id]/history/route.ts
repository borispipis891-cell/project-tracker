import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const projectId = parseInt(params.id);

    const historyEntry = await prisma.projectHistory.create({
      data: {
        projectId,
        date: new Date().toISOString(),
        user: body.user || 'Система',
        action: body.action,
        details: body.details,
      },
    });

    return NextResponse.json(historyEntry);
  } catch (error) {
    console.error('Error creating history entry:', error);
    return NextResponse.json(
      { error: 'Failed to create history entry' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);

    const history = await prisma.projectHistory.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

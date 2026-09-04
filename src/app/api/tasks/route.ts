import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const task = await prisma.task.create({
      data: {
        title: body.title,
        status: body.status,
        receivedAt: body.receivedAt,
        deadline: body.deadline,
        completedAt: body.completedAt,
        responsible: body.responsible,
        engineer: body.engineer,
        customFields: body.customFields || {},
        projectId: body.projectId,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

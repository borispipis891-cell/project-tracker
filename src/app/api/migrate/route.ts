import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projects } = body;

    // Create all projects with their tasks
    const created = [];
    for (const project of projects) {
      const { tasks, comments, history, attachments, ...projectData } = project;

      const created_project = await prisma.project.create({
        data: {
          ...projectData,
          Task: {
            create: tasks || [],
          },
        },
        include: {
          Task: true,
          Comment: true,
          ProjectHistory: true,
          Attachment: true,
        },
      });

      created.push(created_project);
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      projects: created
    });
  } catch (error) {
    console.error('Error migrating data:', error);
    return NextResponse.json(
      { error: 'Failed to migrate data' },
      { status: 500 }
    );
  }
}

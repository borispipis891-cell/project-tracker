import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'File and projectId are required' },
        { status: 400 }
      );
    }

    // Check if user has access to the project
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: {
        ProjectMember: {
          where: {
            userId: currentUser.id,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user is owner or member
    const isOwner = project.ownerId === currentUser.id;
    const isMember = project.ProjectMember.length > 0;

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      buffer,
      `project-tracker/project-${projectId}`
    );

    // Save attachment info to database
    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        url: uploadResult.url,
        cloudinaryId: uploadResult.publicId,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session.user.email,
        projectId: parseInt(projectId),
      },
    });

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        mimeType: attachment.mimeType,
        url: attachment.url,
        uploadedAt: attachment.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

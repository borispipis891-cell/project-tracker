import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const attachmentId = params.id;

    // Find attachment
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        Project: {
          include: {
            ProjectMember: {
              where: {
                User: { email: session.user.email },
              },
            },
            User: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete
    const isOwner = attachment.Project.User?.email === session.user.email;
    const isMember = attachment.Project.ProjectMember.some(
      (m) => m.role === 'owner' || m.role === 'editor'
    );

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(attachment.cloudinaryId);
    } catch (cloudinaryError) {
      console.error('Cloudinary delete failed:', cloudinaryError);
      // Continue to delete from DB even if Cloudinary delete fails
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}

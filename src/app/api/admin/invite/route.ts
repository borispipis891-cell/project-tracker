import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    await prisma.invitation.create({
      data: {
        email,
        token,
        role: 'viewer', // Default role for system-wide invitations
        projectId: null, // System-wide invitation, not project-specific
        invitedBy: session.user.id,
        expiresAt,
        status: 'pending'
      }
    });

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Приглашение в Project Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Приглашение в систему Project Tracker</h2>
          <p>Здравствуйте, ${name}!</p>
          <p>Вы приглашены для работы в системе управления проектами <strong>Project Tracker</strong>.</p>
          <p>Для принятия приглашения перейдите по ссылке:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Принять приглашение
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Или скопируйте эту ссылку в браузер:</p>
          <p style="color: #2563eb; word-break: break-all; font-size: 14px;">${inviteUrl}</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">Ссылка действительна в течение 7 дней.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

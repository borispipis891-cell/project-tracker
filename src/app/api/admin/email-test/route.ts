import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminEmail } from '@/lib/admin';
import { emailTemplates, sendEmail } from '@/lib/email';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const testReminder = emailTemplates.deadlineReminder({
      projectName: 'Тестовый проект',
      deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      daysLeft: 3,
      projectUrl: process.env.APP_URL || process.env.NEXTAUTH_URL,
    });
    await sendEmail({
      to: session.user.email,
      subject: `[ТЕСТ] ${testReminder.subject}`,
      html: testReminder.html,
    });
    return NextResponse.json({ success: true, email: session.user.email });
  } catch (error) {
    console.error('[EMAIL_TEST]', error);
    return NextResponse.json({ error: 'SMTP не отправил письмо. Проверьте настройки почты в Vercel.' }, { status: 500 });
  }
}

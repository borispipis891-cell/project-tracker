import { createHash } from 'crypto';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/lib/prisma';
import { analyzeEmailForTask } from '@/lib/email-task-agent';

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const plainTextFromHtml = (value: string) => value
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

async function allowedSenders() {
  const configured = (process.env.EMAIL_TASK_ALLOWED_SENDERS || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);
  if (configured.includes('*')) return null;

  const users = await prisma.user.findMany({
    where: { status: 'active', isBlocked: false },
    select: { email: true },
  });
  return new Set([
    ...configured,
    ...users.map(user => normalizeEmail(user.email)),
    normalizeEmail(process.env.IMAP_USER || process.env.SMTP_USER || ''),
  ].filter(Boolean));
}

export interface EmailSyncResult {
  checked: number;
  created: number;
  duplicates: number;
  ignored: number;
  failed: number;
}

export async function syncEmailTaskDrafts(): Promise<EmailSyncResult> {
  const user = process.env.IMAP_USER || process.env.SMTP_USER;
  const pass = process.env.IMAP_PASSWORD || process.env.SMTP_PASSWORD;
  if (!user || !pass) throw new Error('Не настроены IMAP_USER/IMAP_PASSWORD или SMTP_USER/SMTP_PASSWORD');

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.mail.ru',
    port: Number(process.env.IMAP_PORT || 993),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user, pass },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 50_000,
  });
  const result: EmailSyncResult = { checked: 0, created: 0, duplicates: 0, ignored: 0, failed: 0 };

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const [allowed, projects, users] = await Promise.all([
      allowedSenders(),
      prisma.project.findMany({
        where: { deletedAt: null, status: { not: 'done' } },
        select: { id: true, name: true, customer: true, pss: true, reg: true, responsible: true, engineer: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.user.findMany({
        where: { status: 'active', isBlocked: false },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    const uidValidity = String(client.mailbox && client.mailbox.uidValidity || '');
    const previousState = await prisma.emailTaskSyncState.findUnique({ where: { id: 'INBOX' } });
    const state = previousState?.uidValidity === uidValidity ? previousState : null;
    const allUidsResult = await client.search({ all: true }, { uid: true });
    const allUids = Array.isArray(allUidsResult) ? allUidsResult : [];
    const latestUid = allUids.length ? Math.max(...allUids) : 0;
    // При первом запуске берём только непрочитанные письма, чтобы не импортировать старый архив.
    // Дальше ориентируемся на UID и не зависим от того, успел ли пользователь открыть письмо.
    const unseenResult = state ? [] : await client.search({ seen: false }, { uid: true });
    const unseenUids = Array.isArray(unseenResult) ? unseenResult : [];
    const candidateUids = state
      ? allUids.filter(uid => uid > state.lastUid).slice(0, 20)
      : unseenUids.slice(-20);

    for (const uid of candidateUids) {
      result.checked += 1;
      try {
        const message = await client.fetchOne(uid, { source: true, internalDate: true }, { uid: true });
        if (!message || !message.source) {
          result.failed += 1;
          continue;
        }

        const parsed = await simpleParser(message.source);
        const sender = parsed.from?.value[0];
        const senderEmail = normalizeEmail(sender?.address || '');
        if (!senderEmail || (allowed && !allowed.has(senderEmail))) {
          result.ignored += 1;
          continue;
        }

        const fallbackId = createHash('sha256')
          .update(`${uid}:${parsed.date?.toISOString() || ''}:${senderEmail}:${parsed.subject || ''}`)
          .digest('hex');
        const messageId = (parsed.messageId || `generated-${fallbackId}`).slice(0, 1000);
        const existing = await prisma.emailTaskDraft.findUnique({ where: { messageId }, select: { id: true } });
        if (existing) {
          result.duplicates += 1;
          continue;
        }

        const html = typeof parsed.html === 'string' ? parsed.html : '';
        const bodyText = (parsed.text || plainTextFromHtml(html) || '(Письмо без текста)').slice(0, 50_000);
        const parsedDate = parsed.date ? new Date(parsed.date) : null;
        const internalDate = message.internalDate ? new Date(message.internalDate) : null;
        const emailReceivedAt = parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate
          : internalDate && !Number.isNaN(internalDate.getTime()) ? internalDate : new Date();
        const attachmentNames = parsed.attachments.map(item => item.filename || 'Вложение');

        try {
          const analysis = await analyzeEmailForTask({
            subject: parsed.subject || '(Без темы)',
            bodyText,
            senderName: sender?.name,
            senderEmail,
            receivedAt: emailReceivedAt,
            attachmentNames,
          }, { projects, users });

          await prisma.emailTaskDraft.create({
            data: {
              messageId,
              mailboxUid: uid,
              senderName: sender?.name || null,
              senderEmail,
              subject: parsed.subject || '(Без темы)',
              bodyText,
              attachmentNames,
              emailReceivedAt,
              title: analysis.title,
              description: analysis.description,
              priority: analysis.priority,
              receivedAt: analysis.receivedAt,
              deadline: analysis.deadline,
              projectId: analysis.projectId,
              responsible: analysis.responsible,
              responsibleId: analysis.responsibleId,
              confidence: analysis.confidence,
              agentNote: analysis.note,
              agentModel: analysis.model,
            },
          });
        } catch (agentError) {
          const fallbackDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
          }).format(emailReceivedAt);
          await prisma.emailTaskDraft.create({
            data: {
              messageId,
              mailboxUid: uid,
              senderName: sender?.name || null,
              senderEmail,
              subject: parsed.subject || '(Без темы)',
              bodyText,
              attachmentNames,
              emailReceivedAt,
              status: 'error',
              title: parsed.subject || 'Задача из письма',
              description: bodyText,
              receivedAt: fallbackDate,
              errorMessage: agentError instanceof Error ? agentError.message.slice(0, 1000) : 'Ошибка анализа письма',
            },
          });
          result.failed += 1;
        }

        result.created += 1;
      } catch (error) {
        result.failed += 1;
        console.error('[EMAIL_TASK_SYNC] Не удалось обработать письмо', uid, error);
      }
    }

    await prisma.emailTaskSyncState.upsert({
      where: { id: 'INBOX' },
      create: { id: 'INBOX', lastUid: latestUid, uidValidity },
      update: { lastUid: latestUid, uidValidity },
    });
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }

  return result;
}

export function emailLayout(title: string, bodyHtml: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h2 style="color: #1e3a8a; margin-bottom: 16px;">${title}</h2>
    <div style="font-size: 14px; line-height: 1.6;">${bodyHtml}</div>
    <hr style="margin-top: 32px; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="font-size: 12px; color: #9ca3af;">Это автоматическое письмо от Project Tracker. Отвечать на него не нужно.</p>
  </div>`;
}

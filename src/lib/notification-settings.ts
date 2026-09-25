export type NotificationScope = 'all' | 'responsible';

export interface NotificationSettings {
  emailOnInvite: boolean;
  emailOnDeadline: boolean;
  emailOnProjectChange: boolean;
  emailOnComment: boolean;
  projectScope: NotificationScope;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailOnInvite: true,
  emailOnDeadline: true,
  emailOnProjectChange: false,
  emailOnComment: true,
  projectScope: 'all',
};

export function getNotificationSettings(value: unknown): NotificationSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }

  const settings = value as Record<string, unknown>;
  return {
    emailOnInvite: settings.emailOnInvite !== false,
    emailOnDeadline: settings.emailOnDeadline !== false,
    emailOnProjectChange: settings.emailOnProjectChange === true,
    emailOnComment: settings.emailOnComment !== false,
    projectScope: settings.projectScope === 'responsible' ? 'responsible' : 'all',
  };
}


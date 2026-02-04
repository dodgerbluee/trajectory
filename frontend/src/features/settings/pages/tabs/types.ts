export type SettingsNotification = { message: string; type: 'success' | 'error' };

export type NotifyFn = (notification: SettingsNotification, timeoutMs?: number) => void;

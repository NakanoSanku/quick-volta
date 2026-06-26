import { apiJson } from './apiClient';

export interface ReminderSettingsDto {
  enabled: boolean;
  timezone: string;
  remindHour: number;
  lastSentOn: string | null;
}

export interface LineStatusDto {
  connection: { bound: false } | { bound: true; boundAt: string };
  reminderSettings: ReminderSettingsDto;
  botAddFriendUrl: string;
}

export function getLineReminderStatus(): Promise<LineStatusDto> {
  return apiJson<LineStatusDto>('/api/line/status');
}

export function createLineBindingCode(): Promise<{ code: string; expiresAt: string; botAddFriendUrl: string }> {
  return apiJson('/api/line/binding-code', { method: 'POST' });
}

export function unlinkLineConnection(): Promise<{ ok: true }> {
  return apiJson('/api/line/connection', { method: 'DELETE' });
}

export function updateReminderSettings(settings: Pick<ReminderSettingsDto, 'enabled' | 'timezone' | 'remindHour'>): Promise<ReminderSettingsDto> {
  return apiJson('/api/reminder-settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export function sendLineTestMessage(): Promise<{ ok: true }> {
  return apiJson('/api/line/test-message', { method: 'POST' });
}

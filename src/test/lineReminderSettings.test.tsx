import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from '../components/Settings';
import * as lineApi from '../services/lineReminderApi';

vi.mock('../services/lineReminderApi');
vi.mock('../hooks/useCsvImportExport', () => ({
  useCsvImportExport: () => ({ parseAndPreviewCsv: vi.fn(), previewRows: [], clearPreview: vi.fn(), confirmImport: vi.fn(), exportToCsv: vi.fn(), errorMsg: '', hasErrors: false, totalCount: 0, validCount: 0 }),
}));

describe('LINE reminder Settings UI', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows unbound LINE status and generates a binding code', async () => {
    vi.mocked(lineApi.getLineReminderStatus).mockResolvedValue({ connection: { bound: false }, reminderSettings: { enabled: false, timezone: 'Asia/Bangkok', remindHour: 9, lastSentOn: null }, botAddFriendUrl: 'https://line.me/R/ti/p/@quickvolta' });
    vi.mocked(lineApi.createLineBindingCode).mockResolvedValue({ code: 'QV-8K3D', expiresAt: '2026-06-25T10:15:00.000Z', botAddFriendUrl: 'https://line.me/R/ti/p/@quickvolta' });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} currentUser={{ id: 'user-1', email: 'me@example.com', name: 'Me', avatarUrl: null }} onLogout={vi.fn()} />);

    expect(await screen.findByText('LINE Reminders')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Generate LINE binding code' }));
    expect(await screen.findByText('QV-8K3D')).toBeInTheDocument();
  });

  it('updates reminder settings and sends a test message when bound', async () => {
    vi.mocked(lineApi.getLineReminderStatus).mockResolvedValue({ connection: { bound: true, boundAt: '2026-06-25T00:00:00.000Z' }, reminderSettings: { enabled: false, timezone: 'Asia/Bangkok', remindHour: 9, lastSentOn: null }, botAddFriendUrl: 'https://line.me/R/ti/p/@quickvolta' });
    vi.mocked(lineApi.updateReminderSettings).mockResolvedValue({ enabled: true, timezone: 'Asia/Bangkok', remindHour: 20, lastSentOn: null });
    vi.mocked(lineApi.sendLineTestMessage).mockResolvedValue({ ok: true });

    render(<Settings cards={[]} onImportSuccess={vi.fn()} currentUser={{ id: 'user-1', email: 'me@example.com', name: 'Me', avatarUrl: null }} onLogout={vi.fn()} />);

    await userEvent.click(await screen.findByLabelText('Enable LINE reminders'));
    await userEvent.selectOptions(screen.getByLabelText('Reminder hour'), '20');
    expect(lineApi.updateReminderSettings).toHaveBeenLastCalledWith({ enabled: true, timezone: 'Asia/Bangkok', remindHour: 20 });

    await userEvent.click(screen.getByRole('button', { name: 'Send LINE test message' }));
    expect(lineApi.sendLineTestMessage).toHaveBeenCalled();
  });
});

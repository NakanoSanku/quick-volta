import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Settings } from '../components/Settings';
import { getLocalMigrationSummary, uploadLocalBrowserData } from '../services/localDataMigration';

vi.mock('../services/localDataMigration', () => ({
  getLocalMigrationSummary: vi.fn(),
  uploadLocalBrowserData: vi.fn(),
}));

describe('local migration Settings UI', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('uploads local browser data and refreshes cards', async () => {
    const onImportSuccess = vi.fn();
    vi.mocked(getLocalMigrationSummary).mockResolvedValue({ cardCount: 2, reviewStatsCount: 1 });
    vi.mocked(uploadLocalBrowserData).mockResolvedValue({ importedCards: 2, importedReviewStats: 1 });

    render(<Settings cards={[]} onImportSuccess={onImportSuccess} currentUser={{ id: 'user-1', email: 'me@example.com', name: 'Me', avatarUrl: null }} onLogout={vi.fn()} />);

    expect(await screen.findByText('Migrate local data to account')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Upload local data' }));

    await waitFor(() => expect(uploadLocalBrowserData).toHaveBeenCalled());
    expect(onImportSuccess).toHaveBeenCalled();
    expect(await screen.findByText('Imported 2 cards and 1 review stats.')).toBeInTheDocument();
  });
});

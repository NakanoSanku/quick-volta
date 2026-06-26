import { apiJson } from './apiClient';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export type CurrentUserResponse =
  | { authenticated: false; user: null }
  | { authenticated: true; user: CurrentUser };

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiJson<CurrentUserResponse>('/api/me');
}

export function loginWithGoogle(): void {
  window.location.assign('/api/auth/google');
}

export async function logout(): Promise<void> {
  await apiJson<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}

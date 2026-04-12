import { get, put, post, del } from './client';
import { UserProfile, Notification } from '@/types/user';

export const userApi = {
  /** GET /users/me */
  me: () => get<{ user: UserProfile }>('/users/me'),

  /** PUT /users/me */
  updateProfile: (body: Partial<{
    fullName: string;
    avatarUrl: string | null;
    preferences: UserProfile['preferences'];
  }>) => put<{ user: UserProfile }>('/users/me', body),

  /** DELETE /users/me */
  deleteAccount: () => del<{ message: string }>('/users/me'),

  // ── Auth ─────────────────────────────────────────────────────────────────────
  /** POST /auth/signup — register Firebase user in backend DB */
  signup: (body: { fullName: string; preferences?: Record<string, unknown> }) =>
    post<{ user: UserProfile; message: string }>('/auth/signup', body),

  /** POST /auth/login — create/refresh backend session */
  login: () => post<{ user: UserProfile; message: string }>('/auth/login', {}),

  // ── Notifications ────────────────────────────────────────────────────────────
  /** GET /users/me/notifications */
  getNotifications: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unreadOnly) qs.set('unreadOnly', 'true');
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return get<{ notifications: Notification[]; unreadCount: number }>(
      `/users/me/notifications?${qs}`,
    );
  },

  /** PUT /users/me/notifications/read — mark as read (PUT, not POST) */
  markNotificationsRead: (ids?: string[]) =>
    put<{ message: string }>('/users/me/notifications/read', { ids }),

  // ── User search ───────────────────────────────────────────────────────────────
  /** GET /users/search?q= */
  search: (q: string) =>
    get<{ users: Array<{ _id: string; fullName: string; email: string; avatarUrl?: string }> }>(
      `/users/search?q=${encodeURIComponent(q)}`,
    ),
};

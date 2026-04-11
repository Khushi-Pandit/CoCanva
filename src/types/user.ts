export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  cursorColor: string;
  language: string;
}

export interface UserProfile {
  _id: string;
  fId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  preferences: UserPreferences;
  canvasCount: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: 'canvas_invite' | 'mention' | 'comment' | 'system';
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}

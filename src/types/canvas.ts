// ── Core Canvas Types ─────────────────────────────────────────────────────────

export type CanvasRole = 'owner' | 'editor' | 'commenter' | 'viewer';
export type CanvasType = 'drawing' | 'notes' | 'diagram';
export type PageSize = 'a4' | 'letter' | 'a3' | 'a5' | 'custom';

export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number; label: string }> = {
  a4:     { width: 794,  height: 1123, label: 'A4' },
  letter: { width: 816,  height: 1056, label: 'Letter' },
  a3:     { width: 1123, height: 1587, label: 'A3' },
  a5:     { width: 559,  height: 794,  label: 'A5' },
  custom: { width: 794,  height: 1123, label: 'Custom' },
};

export interface CanvasSettings {
  aiEnabled: boolean;
  gridEnabled: boolean;
  snapToGrid: boolean;
  voiceEnabled: boolean;
}

export interface ShareToken {
  token: string;
  role: CanvasRole;
  label?: string;
  expiresAt?: string;
  uses: number;
  maxUses?: number;
  createdAt: string;
}

export interface Collaborator {
  user: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  role: CanvasRole;
  joinedAt: string;
}

export interface Canvas {
  _id: string;
  title: string;
  description?: string;
  owner: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  category?: string;
  tags?: string[];
  settings: CanvasSettings;
  collaborators: Collaborator[];
  shareTokens: ShareToken[];
  isPublic: boolean;
  canvasType?: CanvasType;
  pageSize?: PageSize;
  pageOrientation?: 'portrait' | 'landscape';
  pageCount?: number;
  currentBranch?: string;
  thumbnail?: string;
  lastViewport?: { x: number; y: number; zoom: number };
  elementCount?: number;
  deletedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  myRole?: CanvasRole;
}

export interface CanvasBranch {
  _id: string;
  canvasId: string;
  name: string;
  parentBranchId?: string;
  createdBy: string;
  isDefault: boolean;
  createdAt: string;
}

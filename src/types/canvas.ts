// ── Core Canvas Types ─────────────────────────────────────────────────────────

export type CanvasRole = 'owner' | 'editor' | 'commenter' | 'viewer';

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

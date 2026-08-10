// packages/shared-types/src/avatar.ts
export interface Avatar {
    id: string;
    userId: string;
    type: 'uploaded' | 'generated' | 'default';
    objectKey: string;
    mimeType: string;
    isActive: boolean;
    isPrimary: boolean;
    variants?: {
      small?: string;
      medium?: string;
      large?: string;
    };
    createdAt: string;
    updatedAt: string;
  }
  
  // If you want a simpler version for employee lists, you can just use:
  export type AvatarSummary = Pick<Avatar, 'id' | 'userId' | 'isPrimary'> & {
    url?: string; // pre‑computed URL for display
  };
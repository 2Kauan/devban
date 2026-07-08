export type Role = 'user' | 'admin';
export type SharePermission = 'view' | 'edit';
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PaymentMethod = 'pix' | 'credit_card';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed';
export type ProjectPermission = 'owner' | 'editor' | 'viewer' | 'admin' | 'client';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_free: boolean;
  name_changed?: boolean;
  payment_id: string | null;
  share_token: string;
  share_permission: SharePermission;
  share_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  project_id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardCategory {
  id: string;
  card_id: string;
  category_id: string;
}

export interface GoogleAccount {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: string[];
}

export type IntegrationType = 'calendar' | 'drive' | 'docs' | 'sheets' | 'meet' | 'gmail';

export interface IntegrationConfig {
  type: IntegrationType;
  active: boolean;
  projectId?: string;
}

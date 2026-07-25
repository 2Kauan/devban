import { supabase } from '@/lib/supabase';

const callGoogleProxy = async (targetUrl: string, method: string = 'GET', body?: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  // Ensure we use the correct environment variable for the Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const proxyUrl = `${supabaseUrl}/functions/v1/google-api-proxy?target=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Google API Error: ${response.statusText}`);
  }

  return response.json();
};

export const driveService = {
  listFiles: async () => callGoogleProxy('https://www.googleapis.com/drive/v3/files?pageSize=10'),
  getFolder: async (folderId: string) => callGoogleProxy(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,webViewLink,owners,quotaBytesUsed`),
  createFolder: async (name: string) => callGoogleProxy('https://www.googleapis.com/drive/v3/files', 'POST', { name, mimeType: 'application/vnd.google-apps.folder' }),
};

export const docsService = {
  createDocument: async (title: string) => callGoogleProxy('https://docs.googleapis.com/v1/documents', 'POST', { title }),
  getDocument: async (documentId: string) => callGoogleProxy(`https://docs.googleapis.com/v1/documents/${documentId}`),
};

export const sheetsService = {
  createSpreadsheet: async (title: string) => callGoogleProxy('https://sheets.googleapis.com/v4/spreadsheets', 'POST', { properties: { title } }),
  getSpreadsheet: async (spreadsheetId: string) => callGoogleProxy(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`),
};

export const meetService = {
  createMeeting: async (title: string) => callGoogleProxy('https://meet.googleapis.com/v2/spaces', 'POST', { title }),
  getMeeting: async (spaceId: string) => callGoogleProxy(`https://meet.googleapis.com/v2/spaces/${spaceId}`),
};

export const gmailService = {
  sendEmail: async (email: any) => callGoogleProxy('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', 'POST', email),
};

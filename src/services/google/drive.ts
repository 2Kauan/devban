import { supabase } from '@/lib/supabase';

const callGoogleProxy = async (targetUrl: string, method: string = 'GET', body?: any) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Unauthorized');

  const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-api-proxy?target=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl, {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response;
};

// Placeholder service logic - will be expanded per phase requirements
export const driveService = {
  listFiles: async () => callGoogleProxy('https://www.googleapis.com/drive/v3/files'),
  createFolder: async (name: string) => callGoogleProxy('https://www.googleapis.com/drive/v3/files', 'POST', { name, mimeType: 'application/vnd.google-apps.folder' }),
};

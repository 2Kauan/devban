import { GOOGLE_API_BASE } from './GoogleConfig';

export const googleApiFetch = async (
  endpoint: string,
  token: string,
  options: RequestInit = {}
) => {
  const response = await fetch(`${GOOGLE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response;
};

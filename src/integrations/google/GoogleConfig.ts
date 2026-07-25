export const GOOGLE_API_BASE = 'https://www.googleapis.com';

export const GOOGLE_AUTH_SCOPES = {
  calendar: [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ].join(' '),
  drive: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.readonly'
  ].join(' '),
  docs: [
    'https://www.googleapis.com/auth/documents',
  ].join(' '),
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets',
  ].join(' '),
  gmail: [
    'https://www.googleapis.com/auth/gmail.send',
  ].join(' '),
  meet: [
    'https://www.googleapis.com/auth/meetings.space.created',
  ].join(' '),
};

export const getScopesForTypes = (types: string[]): string => {
  const scopes = new Set<string>();
  types.forEach(type => {
    const s = GOOGLE_AUTH_SCOPES[type as keyof typeof GOOGLE_AUTH_SCOPES];
    if (s) s.split(' ').forEach(scope => scopes.add(scope));
  });
  return Array.from(scopes).join(' ');
};

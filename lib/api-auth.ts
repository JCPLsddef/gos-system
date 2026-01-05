import 'server-only';
import { verifyToken } from './supabase-api';

export async function authenticateRequest(request: Request): Promise<{
  userId: string | null;
  error: string | null;
}> {
  const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  } else if (authHeader?.includes('sb-')) {
    const cookies = authHeader.split('; ');
    const authCookie = cookies.find(c => c.includes('sb-') && c.includes('-auth-token'));
    if (authCookie) {
      try {
        const cookieValue = authCookie.split('=')[1];
        const decoded = decodeURIComponent(cookieValue);
        const session = JSON.parse(decoded);
        token = session.access_token;
      } catch (e) {
        return { userId: null, error: 'Failed to extract auth token from cookie' };
      }
    }
  }

  if (!token) {
    return { userId: null, error: 'No auth token provided' };
  }

  return await verifyToken(token);
}

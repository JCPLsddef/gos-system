'use client';

import { supabase } from './supabase';

/**
 * Centralized API client for all server API calls
 * Ensures consistent error handling and authentication
 */

type APIResponse<T = any> = {
  ok: boolean;
  success?: boolean;
  data?: T;
  error?: string;
  details?: string;
};

/**
 * Get current auth token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Get current user ID
 */
async function getUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Failed to get user ID:', error);
    return null;
  }
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  try {
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
      return {
        ok: false,
        error: 'Authentication required. Please sign in.',
      };
    }

    // Ensure endpoint starts with /
    const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Merge headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    console.log(`[API Client] ${options.method || 'GET'} ${url}`);

    // Make request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('[API Client] Failed to parse JSON response:', e);
      return {
        ok: false,
        error: 'Invalid server response',
      };
    }

    // Check for errors
    if (!response.ok) {
      console.error(`[API Client] Error ${response.status}:`, data);
      return {
        ok: false,
        error: data.error || `Request failed with status ${response.status}`,
        details: data.details,
      };
    }

    console.log('[API Client] Success:', data);
    return {
      ok: true,
      ...data,
    };
  } catch (error: any) {
    console.error('[API Client] Request failed:', error);
    return {
      ok: false,
      error: error.message || 'Network error. Please check your connection.',
    };
  }
}

/**
 * API Client Methods
 */
export const apiClient = {
  /**
   * Create a new mission
   */
  async createMission(data: {
    battlefrontId: string;
    title: string;
    attackDate: string;
    dueDate: string;
    durationMinutes: number;
  }): Promise<APIResponse> {
    const userId = await getUserId();
    if (!userId) {
      return { ok: false, error: 'User not authenticated' };
    }

    return apiRequest('/api/actions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_mission',
        userId,
        data,
      }),
    });
  },

  /**
   * Create a calendar event
   */
  async createCalendarEvent(data: {
    missionId?: string;
    battlefrontId?: string;
    title: string;
    startTime: string;
    endTime: string;
  }): Promise<APIResponse> {
    const userId = await getUserId();
    if (!userId) {
      return { ok: false, error: 'User not authenticated' };
    }

    return apiRequest('/api/actions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_calendar_event',
        userId,
        data,
      }),
    });
  },

  /**
   * Get all battlefronts
   */
  async getBattlefronts(): Promise<APIResponse> {
    const userId = await getUserId();
    if (!userId) {
      return { ok: false, error: 'User not authenticated' };
    }

    return apiRequest('/api/actions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get_battlefronts',
        userId,
        data: {},
      }),
    });
  },

  /**
   * Create mission and schedule it in one call
   */
  async createMissionAndSchedule(data: {
    battlefrontId: string;
    title: string;
    attackDate: string;
    dueDate: string;
    durationMinutes: number;
    startTime: string;
  }): Promise<APIResponse> {
    const userId = await getUserId();
    if (!userId) {
      return { ok: false, error: 'User not authenticated' };
    }

    return apiRequest('/api/actions', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_mission_and_schedule',
        userId,
        data,
      }),
    });
  },

  /**
   * Test API connection
   */
  async testConnection(): Promise<APIResponse> {
    return apiRequest('/api/actions', {
      method: 'GET',
    });
  },
};

export default apiClient;

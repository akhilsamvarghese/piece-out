import { getSupabaseConfig } from '../lib/supabaseClient';

function parseJsonMaybe(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildSupabaseError(prefix, response, bodyText) {
  const parsed = parseJsonMaybe(bodyText);
  const detail = parsed?.msg || parsed?.message || parsed?.hint || parsed?.details || '';
  if (detail) {
    return `${prefix} (${response.status}): ${detail}`;
  }
  return `${prefix} (${response.status}).`;
}

export async function signInAdminWithPassword({ adminEmail, password }) {
  const email = String(adminEmail || '').trim().toLowerCase();
  const passwordValue = String(password || '');

  if (!email) {
    throw new Error('Admin email is not configured. Set VITE_ADMIN_EMAIL in .env.local.');
  }

  if (!passwordValue) {
    throw new Error('Enter the admin password.');
  }

  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey
    },
    body: JSON.stringify({
      email,
      password: passwordValue
    })
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(buildSupabaseError('Admin sign-in failed', response, bodyText));
  }

  const data = parseJsonMaybe(bodyText) || {};
  if (!data.access_token) {
    throw new Error('Admin sign-in failed: access token missing.');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresAt: data.expires_at || 0,
    userEmail: data.user?.email || email
  };
}

function toTimestamp(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildLeaderboardRows(rows) {
  return rows
    .map((row) => {
      const startedMs = toTimestamp(row.started_on);
      const completedMs = toTimestamp(row.completed_on);
      return {
        participantName: row.participant_name || '',
        venueName: row.venue_name || '',
        startedOn: row.started_on || '',
        completedOn: row.completed_on || '',
        createdAt: row.created_at || '',
        durationMs: Math.max(0, completedMs - startedMs)
      };
    })
    .sort((a, b) => {
      if (a.durationMs !== b.durationMs) {
        return a.durationMs - b.durationMs;
      }
      return toTimestamp(a.completedOn) - toTimestamp(b.completedOn);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function fetchAdminLeaderboard({ accessToken }) {
  const token = String(accessToken || '').trim();
  if (!token) {
    throw new Error('Admin session token is missing.');
  }

  const { url, anonKey } = getSupabaseConfig();
  const query = 'select=participant_name,venue_name,started_on,completed_on,created_at&order=completed_on.asc';
  const response = await fetch(`${url}/rest/v1/participant_runs?${query}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Profile': 'public',
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(buildSupabaseError('Failed to load leaderboard', response, bodyText));
  }

  const rows = parseJsonMaybe(bodyText);
  if (!Array.isArray(rows)) {
    return [];
  }

  return buildLeaderboardRows(rows);
}

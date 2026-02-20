function normalizeSupabaseUrl(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) {
    return '';
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.replace(/\/rest\/v1$/i, '');
}

function normalizeSupabaseAnonKey(rawValue) {
  return String(rawValue || '')
    .trim()
    .replace(/^Bearer\s+/i, '');
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_ANON_KEY = normalizeSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

function isJwtLikeKey(value) {
  return value.startsWith('eyJ');
}

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  try {
    new URL(SUPABASE_URL);
  } catch {
    throw new Error('VITE_SUPABASE_URL is invalid. Use your Project URL, like https://<project-ref>.supabase.co');
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY
  };
}

function buildSupabaseErrorMessage(response, bodyText, requestUrl) {
  const statusPrefix = `Supabase request failed (${response.status})`;

  if (!bodyText) {
    if (response.status === 404) {
      return `${statusPrefix}. Check VITE_SUPABASE_URL (it should not include /rest/v1).`;
    }
    return `${statusPrefix}.`;
  }

  try {
    const parsed = JSON.parse(bodyText);
    const detail = parsed?.message || parsed?.hint || parsed?.details || '';
    if (detail) {
      return `${statusPrefix}: ${detail}`;
    }
  } catch {
    if (response.status === 404) {
      return `${statusPrefix}. Check VITE_SUPABASE_URL (current request: ${requestUrl}).`;
    }
  }

  return `${statusPrefix}.`;
}

export async function insertParticipantRunRow(payload) {
  const { url, anonKey } = getSupabaseConfig();
  const requestUrl = `${url}/rest/v1/participant_runs`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Content-Profile': 'public',
    apikey: anonKey,
    Prefer: 'return=minimal'
  };

  // Publishable keys (`sb_publishable_...`) are not JWTs. Avoid forcing Bearer JWT auth for those keys.
  if (isJwtLikeKey(anonKey)) {
    headers.Authorization = `Bearer ${anonKey}`;
  }

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(buildSupabaseErrorMessage(response, bodyText, requestUrl));
  }

  if (!bodyText) {
    return null;
  }

  const rows = JSON.parse(bodyText);
  return rows?.[0] || null;
}

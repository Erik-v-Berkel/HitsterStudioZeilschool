// Spotify login via Authorization Code + PKCE (geen backend nodig).
const STORAGE_KEY = 'hitster_spotify_tokens';
const CLIENT_ID_KEY = 'hitster_spotify_client_id';
const VERIFIER_KEY = 'hitster_spotify_pkce_verifier';
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state';

function getRedirectUri() {
  return window.location.origin + window.location.pathname;
}

function getClientId() {
  return (localStorage.getItem(CLIENT_ID_KEY) || '').trim();
}

function setClientId(id) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function sha256base64url(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readTokens() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function writeTokens(tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

async function startLogin() {
  const clientId = getClientId();
  if (!clientId) throw new Error('Geen Spotify Client ID ingesteld. Ga naar Instellingen.');
  const verifier = randomString(64);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await sha256base64url(verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params.toString()}`);
}

// Als de pagina terugkomt van Spotify met ?code=..., wissel dit in voor tokens.
async function handleRedirectIfPresent() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (!code && !error) return false;
  window.history.replaceState({}, document.title, getRedirectUri());
  if (error) throw new Error('Spotify-login geweigerd of mislukt.');

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Login-sessie verlopen. Probeer opnieuw in te loggen.');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: getClientId(),
    code_verifier: verifier,
  });
  let res;
  try {
    res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (e) {
    throw new Error('Geen internetverbinding. Controleer je netwerk en probeer opnieuw.');
  }
  if (!res.ok) throw new Error('Kon niet inloggen bij Spotify. Controleer de Client ID en redirect-URI.');
  const data = await res.json();
  writeTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
  return true;
}

async function refreshAccessToken() {
  const tokens = readTokens();
  if (!tokens || !tokens.refresh_token) throw new Error('Niet ingelogd bij Spotify.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    client_id: getClientId(),
  });
  let res;
  try {
    res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (e) {
    throw new Error('Geen internetverbinding. Controleer je netwerk en probeer opnieuw.');
  }
  if (!res.ok) {
    clearTokens();
    throw new Error('Spotify-login is verlopen. Log opnieuw in.');
  }
  const data = await res.json();
  const updated = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  writeTokens(updated);
  return updated.access_token;
}

async function getValidAccessToken() {
  const tokens = readTokens();
  if (!tokens) throw new Error('Niet ingelogd bij Spotify.');
  if (Date.now() < tokens.expires_at - 5000) return tokens.access_token;
  return refreshAccessToken();
}

function isLoggedIn() {
  return !!readTokens();
}

function logout() {
  clearTokens();
}

export {
  getRedirectUri,
  getClientId,
  setClientId,
  startLogin,
  handleRedirectIfPresent,
  getValidAccessToken,
  isLoggedIn,
  logout,
};

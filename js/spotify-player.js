// Dunne wrapper om de Spotify Web Playback SDK.
let playerInstance = null;
let deviceId = null;

function loadSdkScript() {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onerror = () => reject(new Error('Kon de Spotify-speler niet laden. Controleer je internetverbinding.'));
    document.head.appendChild(script);
  });
}

// getTokenFn moet een Promise<string> met een geldig access token teruggeven.
async function initPlayer(getTokenFn, onStateChange) {
  await loadSdkScript();
  return new Promise((resolve, reject) => {
    playerInstance = new window.Spotify.Player({
      name: 'Hitster',
      getOAuthToken: (cb) => {
        getTokenFn().then(cb).catch(() => reject(new Error('Spotify-login is verlopen. Log opnieuw in.')));
      },
      volume: 0.8,
    });

    playerInstance.addListener('ready', ({ device_id }) => {
      deviceId = device_id;
      resolve();
    });
    playerInstance.addListener('not_ready', () => {
      deviceId = null;
    });
    playerInstance.addListener('initialization_error', ({ message }) => {
      reject(new Error('Spotify-speler kon niet starten: ' + message));
    });
    playerInstance.addListener('authentication_error', () => {
      reject(new Error('Spotify-login is verlopen. Log opnieuw in.'));
    });
    playerInstance.addListener('account_error', () => {
      reject(new Error('Spotify Premium is vereist om nummers af te spelen.'));
    });
    if (onStateChange) playerInstance.addListener('player_state_changed', onStateChange);

    playerInstance.connect();
  });
}

async function playTrackUri(uri, accessToken) {
  if (!deviceId) throw new Error('Spotify-speler is nog niet verbonden. Probeer het opnieuw.');
  let res;
  try {
    res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    });
  } catch (e) {
    throw new Error('Geen internetverbinding. Controleer je netwerk en probeer opnieuw.');
  }
  if (res.status === 403) throw new Error('Spotify Premium is vereist om nummers af te spelen.');
  if (res.status === 404) throw new Error('Spotify-speler is niet gevonden. Probeer het opnieuw.');
  if (!res.ok && res.status !== 204) throw new Error('Kon het nummer niet starten op Spotify.');
}

async function togglePlay() {
  if (!playerInstance) return;
  await playerInstance.togglePlay();
}

async function restart() {
  if (!playerInstance) return;
  await playerInstance.seek(0);
  const state = await playerInstance.getCurrentState();
  if (state && state.paused) await playerInstance.resume();
}

async function pause() {
  if (!playerInstance) return;
  try {
    await playerInstance.pause();
  } catch (e) {
    // speler stond mogelijk al stil
  }
}

export { initPlayer, playTrackUri, togglePlay, restart, pause };

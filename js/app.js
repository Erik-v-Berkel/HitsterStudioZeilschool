import * as auth from './spotify-auth.js';
import * as qr from './qr.js';
import * as player from './spotify-player.js';
import { parseSpotifyTrackUri } from './spotify-track.js';

const els = {
  startStatus: document.getElementById('spotify-status'),
  startError: document.getElementById('start-error'),
  btnLogin: document.getElementById('btn-login'),
  btnScan: document.getElementById('btn-scan'),
  btnSettings: document.getElementById('btn-settings'),

  inputClientId: document.getElementById('input-client-id'),
  redirectUriDisplay: document.getElementById('redirect-uri-display'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnLogout: document.getElementById('btn-logout'),
  btnBackStart: document.getElementById('btn-back-start'),
  settingsError: document.getElementById('settings-error'),

  scanError: document.getElementById('scan-error'),
  btnCancelScan: document.getElementById('btn-cancel-scan'),

  playIndicator: document.getElementById('play-indicator'),
  playingError: document.getElementById('playing-error'),
  btnTogglePlay: document.getElementById('btn-toggle-play'),
  btnRestart: document.getElementById('btn-restart'),
  btnNext: document.getElementById('btn-next'),
};

let playerReadyPromise = null;
let handledScan = false;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setNeutralMetadata() {
  document.title = 'Hitster — speelt af';
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Hitster',
        artist: '',
        album: '',
        artwork: [],
      });
    } catch (e) {
      // mediaSession niet beschikbaar, geen probleem
    }
  }
}

function networkOrMessage(err) {
  if (err instanceof TypeError) return 'Geen internetverbinding. Controleer je netwerk en probeer opnieuw.';
  return err.message || 'Er ging iets mis. Probeer het opnieuw.';
}

function onPlayerStateChanged(state) {
  setNeutralMetadata();
  if (!state) return;
  const paused = state.paused;
  els.btnTogglePlay.textContent = paused ? 'Verder' : 'Pauze';
  els.playIndicator.classList.toggle('paused', paused);
}

function ensurePlayerReady() {
  if (!playerReadyPromise) {
    playerReadyPromise = player
      .initPlayer(auth.getValidAccessToken, onPlayerStateChanged)
      .catch((err) => {
        playerReadyPromise = null;
        throw err;
      });
  }
  return playerReadyPromise;
}

async function updateStartScreen() {
  els.startError.textContent = '';
  const clientId = auth.getClientId();
  if (!clientId) {
    els.btnLogin.hidden = true;
    els.btnScan.hidden = true;
    els.startStatus.textContent = 'Stel eerst een Spotify Client ID in via Instellingen.';
    return;
  }
  if (!auth.isLoggedIn()) {
    els.btnLogin.hidden = false;
    els.btnScan.hidden = true;
    els.startStatus.textContent = 'Log in met je Spotify Premium-account om te beginnen.';
    return;
  }

  els.btnLogin.hidden = true;
  els.btnScan.hidden = true;
  els.startStatus.textContent = 'Verbinden met Spotify...';
  try {
    await ensurePlayerReady();
    els.startStatus.textContent = 'Verbonden met Spotify.';
    els.btnScan.hidden = false;
  } catch (err) {
    els.startStatus.textContent = '';
    els.startError.textContent = networkOrMessage(err);
    els.btnLogin.hidden = false;
  }
}

function onScanError(err) {
  let message = 'Kon de camera niet starten. Probeer het opnieuw.';
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    message = 'Camera-toegang geweigerd. Sta cameratoegang toe in je browserinstellingen en probeer opnieuw.';
  } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    message = 'Geen geschikte camera gevonden op dit apparaat.';
  }
  els.scanError.textContent = message;
}

async function onDecoded(text) {
  if (handledScan) return;
  const uri = parseSpotifyTrackUri(text);
  if (!uri) {
    els.scanError.textContent = 'Onbekende QR-code. Scan een Hitster-kaart met een Spotify-nummer.';
    return;
  }
  handledScan = true;
  await qr.stopScanning();
  startPlaying(uri);
}

function enterScanner() {
  handledScan = false;
  els.scanError.textContent = '';
  showScreen('screen-scanner');
  qr.startScanning('qr-reader', onDecoded, onScanError);
}

async function startPlaying(uri) {
  showScreen('screen-playing');
  els.playingError.textContent = '';
  els.btnTogglePlay.textContent = 'Pauze';
  els.playIndicator.classList.remove('paused');
  setNeutralMetadata();
  try {
    await ensurePlayerReady();
    const token = await auth.getValidAccessToken();
    await player.playTrackUri(uri, token);
  } catch (err) {
    els.playingError.textContent = networkOrMessage(err);
  }
}

function wireEvents() {
  els.btnLogin.addEventListener('click', () => {
    auth.startLogin().catch((err) => {
      els.startError.textContent = networkOrMessage(err);
    });
  });

  els.btnScan.addEventListener('click', enterScanner);

  els.btnSettings.addEventListener('click', () => {
    els.inputClientId.value = auth.getClientId();
    els.redirectUriDisplay.textContent = auth.getRedirectUri();
    els.settingsError.textContent = '';
    showScreen('screen-settings');
  });

  els.btnSaveSettings.addEventListener('click', () => {
    const value = els.inputClientId.value.trim();
    if (!value) {
      els.settingsError.textContent = 'Vul een Spotify Client ID in.';
      return;
    }
    if (value !== auth.getClientId()) {
      // tokens horen bij de vorige Client ID en zijn daarna ongeldig
      auth.logout();
    }
    auth.setClientId(value);
    playerReadyPromise = null;
    showScreen('screen-start');
    updateStartScreen();
  });

  els.btnLogout.addEventListener('click', () => {
    auth.logout();
    playerReadyPromise = null;
    showScreen('screen-start');
    updateStartScreen();
  });

  els.btnBackStart.addEventListener('click', () => {
    showScreen('screen-start');
    updateStartScreen();
  });

  els.btnCancelScan.addEventListener('click', async () => {
    await qr.stopScanning();
    showScreen('screen-start');
    updateStartScreen();
  });

  els.btnTogglePlay.addEventListener('click', async () => {
    try {
      await player.togglePlay();
    } catch (err) {
      els.playingError.textContent = networkOrMessage(err);
    }
  });

  els.btnRestart.addEventListener('click', async () => {
    try {
      await player.restart();
    } catch (err) {
      els.playingError.textContent = networkOrMessage(err);
    }
  });

  els.btnNext.addEventListener('click', async () => {
    await player.pause();
    enterScanner();
  });
}

async function init() {
  els.redirectUriDisplay.textContent = auth.getRedirectUri();
  els.inputClientId.value = auth.getClientId();

  try {
    await auth.handleRedirectIfPresent();
  } catch (err) {
    els.startError.textContent = networkOrMessage(err);
  }

  wireEvents();
  updateStartScreen();
}

init();

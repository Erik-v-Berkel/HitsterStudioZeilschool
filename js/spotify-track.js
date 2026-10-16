// Herleidt een Spotify track-URI uit QR-inhoud: volledige link, spotify:track:-URI of bare ID.
function parseSpotifyTrackUri(text) {
  const trimmed = (text || '').trim();

  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  if (urlMatch) return `spotify:track:${urlMatch[1]}`;

  if (/^spotify:track:[a-zA-Z0-9]+$/.test(trimmed)) return trimmed;

  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return `spotify:track:${trimmed}`;

  return null;
}

export { parseSpotifyTrackUri };

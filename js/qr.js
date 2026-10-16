// Wrapper om html5-qrcode: achtercamera, stopt na een geslaagde scan.
let html5QrCode = null;

async function startScanning(elementId, onDecoded, onError) {
  html5QrCode = new Html5Qrcode(elementId);
  const config = { fps: 10, qrbox: 250 };
  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => onDecoded(decodedText),
      () => {} // normale per-frame "geen code gevonden", negeren
    );
  } catch (err) {
    onError(err);
  }
}

async function stopScanning() {
  if (!html5QrCode) return;
  try {
    await html5QrCode.stop();
  } catch (e) {
    // camera was mogelijk al gestopt
  }
  try {
    html5QrCode.clear();
  } catch (e) {
    // niets te wissen
  }
  html5QrCode = null;
}

export { startScanning, stopScanning };

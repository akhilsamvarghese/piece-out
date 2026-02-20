let audioContext;

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return null;
  }

  if (!audioContext) {
    audioContext = new Context();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => undefined);
  }

  return audioContext;
}

export function playSnapSound({ muted = false } = {}) {
  if (muted) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(1040, start);
  oscillator.frequency.exponentialRampToValueAtTime(720, start + 0.1);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.07, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + 0.12);
}

/* global AudioContext, MediaRecorder, MediaStream, Blob, OfflineAudioContext */
async function recordTabAudio(seconds) {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  try {
    const tracks = stream.getAudioTracks();
    if (!tracks.length) throw new Error('Chromium returned no tab audio track.');
    const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (event) => reject(event.error);
    });
    recorder.start();
    const timer = setTimeout(() => recorder.stop(), seconds * 1000);
    try {
      await stopped;
    } finally {
      clearTimeout(timer);
    }
    const context = new OfflineAudioContext(1, seconds * 16000, 16000);
    const audio = await context.decodeAudioData(await new Blob(chunks).arrayBuffer());
    const source = context.createBufferSource();
    source.buffer = audio;
    source.connect(context.destination);
    source.start();
    const samples = (await context.startRendering()).getChannelData(0);
    const bytes = new Uint8Array(44 + samples.length * 2);
    const header = new DataView(bytes.buffer);
    const ascii = (offset, value) => bytes.set(new TextEncoder().encode(value), offset);
    ascii(0, 'RIFF');
    header.setUint32(4, bytes.length - 8, true);
    ascii(8, 'WAVEfmt ');
    header.setUint32(16, 16, true);
    header.setUint16(20, 1, true);
    header.setUint16(22, 1, true);
    header.setUint32(24, 16000, true);
    header.setUint32(28, 32000, true);
    header.setUint16(32, 2, true);
    header.setUint16(34, 16, true);
    ascii(36, 'data');
    header.setUint32(40, samples.length * 2, true);
    samples.forEach((sample, i) =>
      header.setInt16(44 + 2 * i, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true),
    );
    return Array.from(bytes);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

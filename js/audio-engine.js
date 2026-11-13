/**
 * Web Audio Engine & Real-Time Acoustic Biofeedback Visualizer
 * Replaces legacy ToolBook MCI playSound() calls with cached Web Audio API buffers,
 * sequential pair scheduling, FFT spectral centroid metering, and MediaRecorder comparison.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.bufferCache = new Map();
    this.activeSources = new Set();
    this.sequenceToken = 0;

    // Visualizer state
    this.canvas = null;
    this.spectralMode = 'sibilant';
    this.rafId = null;
    this.lastCentroidHz = 0;
    this.centroidHistory = [];
    this.onTelemetry = null;
    this.onStateChange = null;

    // Microphone & recording state
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.micSource = null;
    this.micChunks = [];
    this.userBuffer = null;
    this.isRecording = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.72;
    }
    if (this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  setVisualizer(canvas, spectralMode = 'sibilant', onTelemetry = null) {
    this.canvas = canvas;
    this.spectralMode = spectralMode;
    this.onTelemetry = onTelemetry;
    this.drawIdleCanvas();
  }

  setSpectralMode(mode) {
    this.spectralMode = mode;
    if (!this.rafId) {
      this.drawIdleCanvas();
    }
  }

  async loadBuffer(filename) {
    const key = filename.toUpperCase();
    if (this.bufferCache.has(key)) {
      return this.bufferCache.get(key);
    }
    await this.ensureContext();
    const response = await fetch(key);
    if (!response.ok) {
      throw new Error(`Unable to load audio file: ${key} (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(key, decoded);
    return decoded;
  }

  preload(filenames) {
    for (const file of filenames) {
      if (file && !this.bufferCache.has(file.toUpperCase())) {
        this.loadBuffer(file).catch(() => {});
      }
    }
  }

  stopAll() {
    this.sequenceToken += 1;
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    this.activeSources.clear();
    if (!this.isRecording) {
      this.stopVisualizerLoop();
    }
    this.onStateChange?.({ playing: false, file: null });
  }

  async playFile(filename, { interrupt = true, playbackRate = 1.0, onStart, onEnd } = {}) {
    if (interrupt) {
      this.stopAll();
    }
    const token = this.sequenceToken;
    await this.ensureContext();
    const buffer = await this.loadBuffer(filename);

    if (token !== this.sequenceToken) {
      return;
    }

    return this.playBuffer(buffer, {
      label: filename,
      playbackRate,
      token,
      onStart,
      onEnd,
    });
  }

  playBuffer(buffer, { label = 'audio', playbackRate = 1.0, token = this.sequenceToken, onStart, onEnd } = {}) {
    return new Promise((resolve) => {
      if (token !== this.sequenceToken) {
        resolve(false);
        return;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      this.activeSources.add(source);
      this.centroidHistory = [];
      this.startVisualizerLoop();
      this.onStateChange?.({ playing: true, file: label });
      onStart?.(label);

      source.onended = () => {
        this.activeSources.delete(source);
        try {
          source.disconnect();
        } catch {
          // ignore
        }
        if (this.activeSources.size === 0 && !this.isRecording) {
          this.stopVisualizerLoop();
          this.onStateChange?.({ playing: false, file: null });
        }
        onEnd?.(label);
        resolve(token === this.sequenceToken);
      };

      source.start(0);
    });
  }

  async playSequence(items, gapMs = 240, { onStepStart, onStepEnd } = {}) {
    this.stopAll();
    const token = this.sequenceToken;
    await this.ensureContext();

    for (let i = 0; i < items.length; i += 1) {
      if (token !== this.sequenceToken) return false;
      const item = items[i];
      const file = typeof item === 'string' ? item : item.file;
      const isUser = typeof item === 'object' && item.isUser;

      onStepStart?.(i, item);
      if (isUser && this.userBuffer) {
        await this.playBuffer(this.userBuffer, { label: 'YOUR_VOICE', token });
      } else if (file) {
        const buffer = await this.loadBuffer(file);
        if (token !== this.sequenceToken) return false;
        await this.playBuffer(buffer, { label: file, token });
      }
      onStepEnd?.(i, item);

      if (token !== this.sequenceToken) return false;
      if (i < items.length - 1 && gapMs > 0) {
        await new Promise((r) => setTimeout(r, gapMs));
      }
    }
    return token === this.sequenceToken;
  }

  async startRecording() {
    this.stopAll();
    await this.ensureContext();

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone recording is not supported in this browser.');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.micChunks = [];
    this.micSource = this.ctx.createMediaStreamSource(this.mediaStream);
    // Connect mic to analyser only (do NOT route to destination to avoid feedback)
    try {
      this.analyser.disconnect();
    } catch {
      // not connected
    }
    this.micSource.connect(this.analyser);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : '';
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.mediaStream, { mimeType })
      : new MediaRecorder(this.mediaStream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.micChunks.push(e.data);
      }
    };

    this.isRecording = true;
    this.centroidHistory = [];
    this.startVisualizerLoop();
    this.mediaRecorder.start();
  }

  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          this.isRecording = false;
          this.stopVisualizerLoop();
          if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
          }
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((t) => t.stop());
            this.mediaStream = null;
          }
          const blob = new Blob(this.micChunks, {
            type: this.mediaRecorder.mimeType || 'audio/webm',
          });
          const arrayBuf = await blob.arrayBuffer();
          this.userBuffer = await this.ctx.decodeAudioData(arrayBuf);
          resolve(this.userBuffer);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  async playUserRecording() {
    if (!this.userBuffer) return false;
    this.stopAll();
    const token = this.sequenceToken;
    await this.ensureContext();
    return this.playBuffer(this.userBuffer, { label: 'YOUR_VOICE', token });
  }

  startVisualizerLoop() {
    if (this.rafId || !this.canvas) return;
    const render = () => {
      this.drawLiveFrame();
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  stopVisualizerLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.drawIdleCanvas();
  }

  drawIdleCanvas() {
    if (!this.canvas) return;
    const ctx2d = this.canvas.getContext('2d');
    const { width, height } = this.canvas;
    ctx2d.clearRect(0, 0, width, height);
    this.drawGuides(ctx2d, width, height);

    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.45)';
    ctx2d.font = '500 12px system-ui, sans-serif';
    ctx2d.textAlign = 'center';
    const label = this.userBuffer
      ? 'Ready — click any word or Compare to inspect acoustic spectrum'
      : 'Click any word or + pair button to inspect live FFT spectrum & waveform';
    ctx2d.fillText(label, width / 2, height / 2);
  }

  drawGuides(ctx2d, width, height) {
    const maxFreq = this.spectralMode === 'vowel' ? 4000 : 10000;
    const freqToX = (hz) => Math.max(0, Math.min(width, (hz / maxFreq) * width));

    if (this.spectralMode === 'sibilant') {
      // Postalveolar /ʃ/ band (2.4 - 3.8 kHz)
      const x1 = freqToX(2400);
      const x2 = freqToX(3800);
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx2d.fillRect(x1, 0, x2 - x1, height);

      // Greek retracted [s̠] trap zone (4.2 - 5.5 kHz)
      const gx1 = freqToX(4200);
      const gx2 = freqToX(5500);
      ctx2d.fillStyle = 'rgba(245, 158, 11, 0.10)';
      ctx2d.fillRect(gx1, 0, gx2 - gx1, height);

      // Alveolar /s/ band (6.0 - 8.8 kHz)
      const sx1 = freqToX(6000);
      const sx2 = freqToX(8800);
      ctx2d.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx2d.fillRect(sx1, 0, sx2 - sx1, height);

      ctx2d.font = '600 10px system-ui, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx2d.fillText('/ʃ/ 2.5–3.8 kHz', (x1 + x2) / 2, 14);
      ctx2d.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx2d.fillText('Greek [s̠] trap', (gx1 + gx2) / 2, 14);
      ctx2d.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx2d.fillText('/s/ 6–8.5 kHz', (sx1 + sx2) / 2, 14);
    } else if (this.spectralMode === 'vowel') {
      // F1 (250 - 900 Hz) & F2 (900 - 2600 Hz) formant regions
      const f1a = freqToX(250);
      const f1b = freqToX(900);
      const f2a = freqToX(900);
      const f2b = freqToX(2600);
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.10)';
      ctx2d.fillRect(f1a, 0, f1b - f1a, height);
      ctx2d.fillStyle = 'rgba(168, 85, 247, 0.10)';
      ctx2d.fillRect(f2a, 0, f2b - f2a, height);

      ctx2d.font = '600 10px system-ui, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.9)';
      ctx2d.fillText('F1 Jaw Height (250–900 Hz)', (f1a + f1b) / 2, 14);
      ctx2d.fillStyle = 'rgba(168, 85, 247, 0.9)';
      ctx2d.fillText('F2 Tongue Frontness (0.9–2.6 kHz)', (f2a + f2b) / 2, 14);
    } else {
      ctx2d.font = '600 10px system-ui, sans-serif';
      ctx2d.textAlign = 'left';
      ctx2d.fillStyle = 'rgba(148, 163, 184, 0.75)';
      ctx2d.fillText('Spectrum (0–10 kHz) + Time-Domain Envelope', 10, 14);
    }

    // Frequency ticks
    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx2d.font = '500 10px ui-monospace, monospace';
    ctx2d.textAlign = 'center';
    const step = maxFreq === 4000 ? 1000 : 2000;
    for (let hz = step; hz < maxFreq; hz += step) {
      const x = freqToX(hz);
      ctx2d.fillRect(x, height - 16, 1, 4);
      ctx2d.fillText(`${hz / 1000}k`, x, height - 3);
    }
  }

  drawLiveFrame() {
    if (!this.canvas || !this.analyser || !this.ctx) return;
    const ctx2d = this.canvas.getContext('2d');
    const { width, height } = this.canvas;

    const binCount = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(binCount);
    const timeData = new Uint8Array(binCount);
    this.analyser.getByteFrequencyData(freqData);
    this.analyser.getByteTimeDomainData(timeData);

    ctx2d.clearRect(0, 0, width, height);
    this.drawGuides(ctx2d, width, height);

    const sampleRate = this.ctx.sampleRate;
    const nyquist = sampleRate / 2;
    const maxFreq = this.spectralMode === 'vowel' ? 4000 : 10000;
    const maxBin = Math.min(binCount - 1, Math.floor((maxFreq / nyquist) * binCount));

    // Draw FFT spectrum bars/curve
    let weightedSum = 0;
    let totalEnergy = 0;
    const plotBottom = height - 18;
    const plotTop = 22;
    const plotHeight = plotBottom - plotTop;

    ctx2d.beginPath();
    ctx2d.moveTo(0, plotBottom);
    for (let i = 1; i <= maxBin; i += 1) {
      const hz = (i / binCount) * nyquist;
      const x = (hz / maxFreq) * width;
      const amp = freqData[i] / 255;
      const y = plotBottom - amp * plotHeight * 0.85;
      ctx2d.lineTo(x, y);

      if (hz >= 250 && hz <= 9500) {
        const power = amp * amp;
        weightedSum += hz * power;
        totalEnergy += power;
      }
    }
    ctx2d.lineTo(width, plotBottom);
    ctx2d.closePath();

    const grad = ctx2d.createLinearGradient(0, plotTop, width, plotBottom);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.35)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.45)');
    ctx2d.fillStyle = grad;
    ctx2d.fill();

    ctx2d.strokeStyle = this.isRecording ? '#f43f5e' : '#38bdf8';
    ctx2d.lineWidth = 2;
    ctx2d.stroke();

    // Draw subtle time-domain waveform overlay in the upper band
    ctx2d.beginPath();
    for (let i = 0; i < binCount; i += 4) {
      const x = (i / binCount) * width;
      const v = (timeData[i] - 128) / 128;
      const y = plotTop + plotHeight * 0.25 + v * 22;
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
    }
    ctx2d.strokeStyle = 'rgba(248, 250, 252, 0.55)';
    ctx2d.lineWidth = 1.25;
    ctx2d.stroke();

    // Compute and draw spectral centroid marker when speech energy is present
    if (totalEnergy > 0.08) {
      const centroidHz = Math.round(weightedSum / totalEnergy);
      this.lastCentroidHz = centroidHz;
      this.centroidHistory.push(centroidHz);
      const cx = Math.max(0, Math.min(width, (centroidHz / maxFreq) * width));

      ctx2d.strokeStyle = '#fbbf24';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.moveTo(cx, plotTop);
      ctx2d.lineTo(cx, plotBottom);
      ctx2d.stroke();

      ctx2d.fillStyle = '#fbbf24';
      ctx2d.font = '700 11px ui-monospace, monospace';
      ctx2d.textAlign = cx > width - 85 ? 'right' : 'left';
      ctx2d.fillText(`${centroidHz} Hz`, cx + (cx > width - 85 ? -6 : 6), plotTop + 12);

      this.onTelemetry?.({ centroidHz, active: true });
    }
  }
}


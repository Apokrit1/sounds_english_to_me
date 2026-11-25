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

    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.72)';
    ctx2d.font = '500 12px system-ui, sans-serif';
    ctx2d.textAlign = 'center';
    const label = this.userBuffer
      ? 'Ready: click any word or Compare to inspect the acoustic spectrum'
      : 'Click any word or + pair button to inspect live FFT spectrum and waveform';
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
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.92)';
      ctx2d.fillText('/ʃ/ 2.5–3.8k', (x1 + x2) / 2, 14);
      ctx2d.fillStyle = 'rgba(245, 158, 11, 0.92)';
      ctx2d.fillText('[s̠] trap', (gx1 + gx2) / 2, 14);
      ctx2d.fillStyle = 'rgba(16, 185, 129, 0.92)';
      ctx2d.fillText('/s/ 6–8.5 kHz', (sx1 + sx2) / 2, 14);
    } else if (this.spectralMode === 'vowel') {
      // F1 (250 - 900 Hz) & F2 (900 - 2600 Hz) formant regions
      const f1a = freqToX(250);
      const f1b = freqToX(900);
      const f2a = freqToX(900);
      const f2b = freqToX(2600);
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.10)';
      ctx2d.fillRect(f1a, 0, f1b - f1a, height);
      ctx2d.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx2d.fillRect(f2a, 0, f2b - f2a, height);

      ctx2d.font = '600 10px system-ui, sans-serif';
      ctx2d.textAlign = 'center';
      ctx2d.fillStyle = 'rgba(56, 189, 248, 0.92)';
      ctx2d.fillText('F1 Jaw Height (250–900 Hz)', (f1a + f1b) / 2, 14);
      ctx2d.fillStyle = 'rgba(34, 211, 238, 0.92)';
      ctx2d.fillText('F2 Tongue Frontness (0.9–2.6 kHz)', (f2a + f2b) / 2, 14);
    } else {
      ctx2d.font = '600 10px system-ui, sans-serif';
      ctx2d.textAlign = 'left';
      ctx2d.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx2d.fillText('Spectrum (0–10 kHz) + Time-Domain Envelope', 10, 14);
    }

    // Frequency ticks
    ctx2d.fillStyle = 'rgba(148, 163, 184, 0.55)';
    ctx2d.font = '500 10px system-ui, sans-serif';
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
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.44)');
    grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.30)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0.42)');
    ctx2d.fillStyle = grad;
    ctx2d.fill();

    ctx2d.strokeStyle = this.isRecording ? '#fb7185' : '#38bdf8';
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

  /* ========================================================================
     Acoustic Comparison: User Production vs. 1994 Native Model
     ======================================================================== */

  async compareWithModel(modelFilename, targetWord, unit) {
    if (!this.userBuffer) {
      throw new Error('Record your voice first before comparing.');
    }
    const modelBuffer = await this.loadBuffer(modelFilename);

    const modelActive = this.extractActiveSpeech(modelBuffer);
    const userActive = this.extractActiveSpeech(this.userBuffer);

    if (userActive.samples.length < this.userBuffer.sampleRate * 0.08) {
      return {
        tooQuiet: true,
        overallPct: 0,
        spectralPct: 0,
        durationPct: 0,
        centroidPct: 0,
        modelMs: Math.round(modelActive.durationMs),
        userMs: Math.round(userActive.durationMs),
        modelCentroidHz: 0,
        userCentroidHz: 0,
        modelSibilantHz: 0,
        userSibilantHz: 0,
        tips: [
          'Your recording was too quiet or too short to analyze. Move closer to the microphone and speak the word clearly.',
        ],
      };
    }

    const maxCompareHz = Math.min(
      modelActive.sampleRate / 2,
      userActive.sampleRate / 2,
      8000
    );

    const modelProfile = this.computeAcousticProfile(modelActive, maxCompareHz);
    const userProfile = this.computeAcousticProfile(userActive, maxCompareHz);

    // 1. Time-normalized Bark-band spectral trajectory cosine similarity
    let frameSimSum = 0;
    for (let f = 0; f < modelProfile.frames.length; f += 1) {
      frameSimSum += this.cosineSimilarity(modelProfile.frames[f], userProfile.frames[f]);
    }
    const rawSpectralSim = frameSimSum / modelProfile.frames.length;
    // Map typical speech cosine range [0.55, 0.99] -> [15, 100] for intuitive scoring
    const spectralPct = Math.round(
      Math.max(0, Math.min(100, ((rawSpectralSim - 0.5) / 0.48) * 100))
    );

    // 2. Duration ratio match
    const durRatio =
      Math.min(modelActive.durationMs, userActive.durationMs) /
      Math.max(modelActive.durationMs, userActive.durationMs, 1);
    const durationPct = Math.round(Math.max(0, Math.min(100, durRatio * 100)));

    // 3. Spectral centroid match (uses sibilant centroid in sibilant mode if present)
    const refHz =
      unit.l1Interference.spectralMode === 'sibilant' && modelProfile.sibilantCentroidHz > 0
        ? modelProfile.sibilantCentroidHz
        : modelProfile.overallCentroidHz;
    const usrHz =
      unit.l1Interference.spectralMode === 'sibilant' && userProfile.sibilantCentroidHz > 0
        ? userProfile.sibilantCentroidHz
        : userProfile.overallCentroidHz;

    const hzDiffRatio = Math.abs(refHz - usrHz) / Math.max(refHz, 500);
    const centroidPct = Math.round(Math.max(0, Math.min(100, (1 - hzDiffRatio * 0.9) * 100)));

    const overallPct = Math.round(
      spectralPct * 0.6 + centroidPct * 0.25 + durationPct * 0.15
    );

    const tips = this.generatePhoneticTips({
      unit,
      targetWord,
      modelProfile,
      userProfile,
      modelMs: modelActive.durationMs,
      userMs: userActive.durationMs,
      overallPct,
    });

    return {
      tooQuiet: false,
      overallPct,
      spectralPct,
      durationPct,
      centroidPct,
      modelMs: Math.round(modelActive.durationMs),
      userMs: Math.round(userActive.durationMs),
      modelCentroidHz: Math.round(modelProfile.overallCentroidHz),
      userCentroidHz: Math.round(userProfile.overallCentroidHz),
      modelSibilantHz: Math.round(modelProfile.sibilantCentroidHz),
      userSibilantHz: Math.round(userProfile.sibilantCentroidHz),
      tips,
    };
  }

  extractActiveSpeech(audioBuffer) {
    const raw = audioBuffer.getChannelData(0);
    const sr = audioBuffer.sampleRate;

    // Normalize peak amplitude first
    let peak = 0;
    for (let i = 0; i < raw.length; i += 1) {
      const a = Math.abs(raw[i]);
      if (a > peak) peak = a;
    }
    const norm = new Float32Array(raw.length);
    const scale = peak > 1e-4 ? 1 / peak : 1;
    for (let i = 0; i < raw.length; i += 1) {
      norm[i] = raw[i] * scale;
    }

    // Trim leading/trailing silence using 10ms RMS windows
    const win = Math.max(64, Math.floor(sr * 0.01));
    const threshold = 0.045;
    let startIdx = 0;
    let endIdx = norm.length - 1;

    for (let i = 0; i + win < norm.length; i += win) {
      let sum = 0;
      for (let j = 0; j < win; j += 1) sum += norm[i + j] * norm[i + j];
      if (Math.sqrt(sum / win) > threshold) {
        startIdx = Math.max(0, i - win);
        break;
      }
    }
    for (let i = norm.length - win; i >= startIdx; i -= win) {
      let sum = 0;
      for (let j = 0; j < win; j += 1) sum += norm[i + j] * norm[i + j];
      if (Math.sqrt(sum / win) > threshold) {
        endIdx = Math.min(norm.length - 1, i + win * 2);
        break;
      }
    }

    const sliced = norm.subarray(startIdx, Math.max(startIdx + 1, endIdx));
    return {
      samples: sliced,
      sampleRate: sr,
      durationMs: (sliced.length / sr) * 1000,
    };
  }

  computeAcousticProfile(active, maxCompareHz) {
    const { samples, sampleRate } = active;
    const fftSize = 512;
    const numFrames = 14;
    const numBands = 16;
    const frames = [];

    let weightedHz = 0;
    let totalPower = 0;
    let sibWeightedHz = 0;
    let sibPower = 0;

    // Precompute Bark-spaced band edges from 150 Hz to maxCompareHz
    const hzToBark = (hz) => 13 * Math.atan(0.00076 * hz) + 3.5 * Math.atan((hz / 7500) ** 2);
    const barkToHz = (b) => {
      // Simple binary search inversion for exactness
      let lo = 100;
      let hi = maxCompareHz;
      for (let k = 0; k < 16; k += 1) {
        const mid = (lo + hi) / 2;
        if (hzToBark(mid) < b) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    };

    const minBark = hzToBark(150);
    const maxBark = hzToBark(maxCompareHz);
    const bandEdges = [];
    for (let b = 0; b <= numBands; b += 1) {
      bandEdges.push(barkToHz(minBark + (b / numBands) * (maxBark - minBark)));
    }

    const maxStart = Math.max(0, samples.length - fftSize);
    for (let f = 0; f < numFrames; f += 1) {
      const start = Math.floor((f / Math.max(1, numFrames - 1)) * maxStart);
      const mag = this.fftMagnitude(samples, start, fftSize);

      const bands = new Float32Array(numBands);
      for (let bin = 1; bin < fftSize / 2; bin += 1) {
        const hz = (bin * sampleRate) / fftSize;
        if (hz < 150 || hz > maxCompareHz) continue;
        const pwr = mag[bin] * mag[bin];

        weightedHz += hz * pwr;
        totalPower += pwr;

        if (hz >= 2000 && hz <= maxCompareHz) {
          sibWeightedHz += hz * pwr;
          sibPower += pwr;
        }

        for (let b = 0; b < numBands; b += 1) {
          if (hz >= bandEdges[b] && hz < bandEdges[b + 1]) {
            bands[b] += pwr;
            break;
          }
        }
      }

      // Log-compress & L2-normalize frame vector
      let normSq = 0;
      for (let b = 0; b < numBands; b += 1) {
        bands[b] = Math.log1p(bands[b] * 100);
        normSq += bands[b] * bands[b];
      }
      const norm = Math.sqrt(normSq) || 1;
      for (let b = 0; b < numBands; b += 1) {
        bands[b] /= norm;
      }
      frames.push(bands);
    }

    return {
      frames,
      overallCentroidHz: totalPower > 0 ? weightedHz / totalPower : 0,
      sibilantCentroidHz: sibPower > 0 ? sibWeightedHz / sibPower : 0,
    };
  }

  fftMagnitude(samples, start, n) {
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const s = start + i < samples.length ? samples[start + i] : 0;
      // Hann window
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      re[i] = s * w;
    }

    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n; i += 1) {
      if (i < j) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
      let m = n >> 1;
      while (m >= 1 && j >= m) {
        j -= m;
        m >>= 1;
      }
      j += m;
    }

    // Cooley-Tukey radix-2 FFT
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = (-2 * Math.PI) / size;
      for (let i = 0; i < n; i += size) {
        for (let k = 0; k < half; k += 1) {
          const angle = k * step;
          const wr = Math.cos(angle);
          const wi = Math.sin(angle);
          const idx1 = i + k;
          const idx2 = idx1 + half;
          const tr = wr * re[idx2] - wi * im[idx2];
          const ti = wr * im[idx2] + wi * re[idx2];
          re[idx2] = re[idx1] - tr;
          im[idx2] = im[idx1] - ti;
          re[idx1] += tr;
          im[idx1] += ti;
        }
      }
    }

    const mag = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i += 1) {
      mag[i] = Math.hypot(re[i], im[i]);
    }
    return mag;
  }

  cosineSimilarity(a, b) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
  }

  generatePhoneticTips({ unit, targetWord, modelProfile, userProfile, modelMs, userMs, overallPct }) {
    const tips = [];
    const mode = unit.l1Interference.spectralMode;
    const ipa = targetWord.ipa;

    if (mode === 'sibilant') {
      const refSib = Math.round(modelProfile.sibilantCentroidHz);
      const usrSib = Math.round(userProfile.sibilantCentroidHz);
      if (ipa.includes('ʃ') || ipa.includes('tʃ')) {
        if (usrSib > 4200 && usrSib > refSib + 500) {
          tips.push(
            `Your fricative energy peaked at ${usrSib} Hz (close to the Greek retracted [s̠] / English /s/ zone). Round and protrude your lips slightly and pull the tongue blade back to lower the peak toward ${refSib} Hz.`
          );
        } else {
          tips.push(
            `Good postalveolar resonance (${usrSib} Hz vs. model ${refSib} Hz) — your lip rounding is keeping the frication in the lower /ʃ/ band.`
          );
        }
      } else if (ipa.includes('s')) {
        if (usrSib < 4600 && usrSib < refSib - 600) {
          tips.push(
            `Your /s/ peak was ${usrSib} Hz (slightly retracted toward [s̠]). Spread your lips gently and bring the tongue tip closer to the alveolar ridge to sharpen energy above 5,500 Hz (model: ${refSib} Hz).`
          );
        } else {
          tips.push(
            `Strong high-frequency /s/ energy (${usrSib} Hz vs. model ${refSib} Hz).`
          );
        }
      }
    }

    if (mode === 'vowel') {
      const ratio = userMs / Math.max(1, modelMs);
      const isLongVowel = ipa.includes('ː');
      if (isLongVowel && ratio < 0.72) {
        tips.push(
          `Your "${targetWord.text}" was noticeably shorter than the model (${Math.round(userMs)} ms vs. ${Math.round(modelMs)} ms). Sustain the long vowel slightly longer while keeping tongue quality steady.`
        );
      } else if (!isLongVowel && ratio > 1.45) {
        tips.push(
          `Your "${targetWord.text}" was ${Math.round(userMs)} ms vs. the model's ${Math.round(modelMs)} ms. Keep short lax vowels crisp and avoid over-lengthening.`
        );
      }

      const refC = Math.round(modelProfile.overallCentroidHz);
      const usrC = Math.round(userProfile.overallCentroidHz);
      if (Math.abs(usrC - refC) > 350) {
        tips.push(
          `Spectral balance shifted (${usrC} Hz vs. model ${refC} Hz). ${unit.l1Interference.coachingTip}`
        );
      }
    }

    if (mode === 'vot') {
      const ratio = userMs / Math.max(1, modelMs);
      if (ratio < 0.65) {
        tips.push(
          `Your utterance was shorter than Frederica's (${Math.round(userMs)} ms vs. ${Math.round(modelMs)} ms) — make sure initial aspiration or final vowel length isn't clipped.`
        );
      } else {
        tips.push(
          `Timing matches the model well (${Math.round(userMs)} ms vs. ${Math.round(modelMs)} ms). Check the white waveform for the stop-closure gap and burst.`
        );
      }
    }

    if (mode === 'nasal') {
      const usrC = Math.round(userProfile.overallCentroidHz);
      const refC = Math.round(modelProfile.overallCentroidHz);
      if (!targetWord.text.endsWith('k') && usrC > refC + 450) {
        tips.push(
          `Extra high-frequency energy (${usrC} Hz vs. model ${refC} Hz) suggests a slight /k/ or /ɡ/ release at the end of "${targetWord.text}". Keep the back of your tongue sealed until your voice stops.`
        );
      } else {
        tips.push(
          `Clean nasal/coda balance (${usrC} Hz vs. model ${refC} Hz).`
        );
      }
    }

    if (tips.length === 0) {
      if (overallPct >= 80) {
        tips.push('Strong acoustic match in both spectral shape and timing! Try testing yourself on the contrasting word in this pair.');
      } else {
        tips.push(unit.l1Interference.coachingTip);
      }
    }

    return tips;
  }
}


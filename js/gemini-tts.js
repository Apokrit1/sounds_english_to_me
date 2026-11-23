/**
 * Gemini TTS Speech Synthesizer for the Glossary
 * Priority order:
 *  1. Pre-generated static Gemini TTS audio file (./audio/glossary/<slug>.wav) if present
 *  2. Live Gemini TTS API (gemini-2.5-flash-preview-tts) when user provides a Gemini API key
 *  3. Browser SpeechSynthesis (en-GB) fallback so the page always works out of the box
 */

const GEMINI_KEY_STORAGE = 'setm-gemini-api-key';
const GEMINI_VOICE_STORAGE = 'setm-gemini-voice';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore (Firm, Clear)' },
  { id: 'Aoede', label: 'Aoede (Warm, Breezy)' },
  { id: 'Puck', label: 'Puck (Upbeat)' },
  { id: 'Charon', label: 'Charon (Informative)' },
  { id: 'Fenrir', label: 'Fenrir (Excitable)' },
  { id: 'Leda', label: 'Leda (Youthful)' },
];

export function slugifyWord(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class GeminiTtsPlayer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.memCache = new Map(); // cacheKey -> AudioBuffer
    this.staticMissing = new Set(); // slugs confirmed 404
    this.currentMode = 'idle'; // 'static-gemini' | 'live-gemini' | 'browser-fallback'
  }

  getApiKey() {
    return (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  }

  setApiKey(key) {
    const trimmed = (key || '').trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  }

  getVoice() {
    return localStorage.getItem(GEMINI_VOICE_STORAGE) || 'Kore';
  }

  setVoice(voice) {
    localStorage.setItem(GEMINI_VOICE_STORAGE, voice);
  }

  stop() {
    this.audioEngine.stopAll();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Speaks the definition & example for a glossary entry.
   * Returns { source: 'static-gemini' | 'live-gemini' | 'browser-fallback', error?: string }
   */
  async speakEntry(entry) {
    this.stop();
    const slug = slugifyWord(entry.word);
    const voice = this.getVoice();
    const textToRead = `${entry.word}. ${entry.definition} For example: ${entry.example}`;

    // 1. Try pre-generated static Gemini TTS audio (./audio/glossary/<slug>.wav)
    if (!this.staticMissing.has(slug)) {
      const staticPath = `./audio/glossary/${slug}.wav`;
      try {
        await this.audioEngine.ensureContext();
        const res = await fetch(staticPath);
        if (res.ok) {
          const buf = await this.audioEngine.ctx.decodeAudioData(await res.arrayBuffer());
          await this.audioEngine.playBuffer(buf, { label: `GEMINI_STATIC:${slug}` });
          return { source: 'static-gemini' };
        }
        this.staticMissing.add(slug);
      } catch {
        this.staticMissing.add(slug);
      }
    }

    // 2. Try live Gemini TTS API if an API key is configured
    const apiKey = this.getApiKey();
    if (apiKey) {
      const cacheKey = `${slug}::${voice}`;
      try {
        let buffer = this.memCache.get(cacheKey);
        if (!buffer) {
          buffer = await this.synthesizeWithGemini(textToRead, apiKey, voice);
          this.memCache.set(cacheKey, buffer);
        }
        await this.audioEngine.playBuffer(buffer, { label: `GEMINI_LIVE:${slug}` });
        return { source: 'live-gemini' };
      } catch (err) {
        // Fall through to browser speech synthesis, reporting the Gemini error cleanly
        await this.speakWithBrowserFallback(textToRead);
        return { source: 'browser-fallback', error: err.message };
      }
    }

    // 3. Fallback to built-in browser en-GB voice
    await this.speakWithBrowserFallback(textToRead);
    return { source: 'browser-fallback' };
  }

  async synthesizeWithGemini(text, apiKey, voiceName) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Read clearly in neutral British English at a natural, learner-friendly pace: ${text}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Gemini TTS HTTP ${response.status}${errText ? ': ' + errText.slice(0, 120) : ''}`);
    }

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!inlineData?.data) {
      throw new Error('Gemini TTS returned no audio data.');
    }

    const pcmBytes = this.base64ToUint8Array(inlineData.data);
    const mime = (inlineData.mimeType || '').toLowerCase();

    await this.audioEngine.ensureContext();

    // Gemini TTS typically returns audio/L16;codec=pcm;rate=24000
    if (mime.includes('pcm') || mime.includes('l16') || !mime.includes('wav')) {
      const rateMatch = mime.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
      const wavBuffer = this.wrapPcm16AsWav(pcmBytes, sampleRate, 1);
      return this.audioEngine.ctx.decodeAudioData(wavBuffer);
    }

    return this.audioEngine.ctx.decodeAudioData(pcmBytes.buffer.slice(0));
  }

  base64ToUint8Array(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }

  wrapPcm16AsWav(pcmBytes, sampleRate = 24000, channels = 1) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcmBytes.byteLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, pcmBytes.byteLength, true);

    const wav = new Uint8Array(44 + pcmBytes.byteLength);
    wav.set(new Uint8Array(header), 0);
    wav.set(pcmBytes, 44);
    return wav.buffer;
  }

  speakWithBrowserFallback(text) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-GB';
      utt.rate = 0.94;
      const voices = window.speechSynthesis.getVoices();
      const gbVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (gbVoice) utt.voice = gbVoice;
      utt.onend = () => resolve(true);
      utt.onerror = () => resolve(false);
      window.speechSynthesis.speak(utt);
    });
  }
}

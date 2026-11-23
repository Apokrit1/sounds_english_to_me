/**
 * Batch-generates static Gemini TTS audio files (./audio/glossary/<slug>.wav)
 * for all 156 glossary entries using gemini-2.5-flash-preview-tts.
 *
 * Usage (PowerShell):
 *   $env:GEMINI_API_KEY="your-api-key"
 *   node scripts/generate-glossary-tts.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { GLOSSARY } from '../data/glossary.js';

const API_KEY = process.env.GEMINI_API_KEY;
const VOICE = process.env.GEMINI_VOICE || 'Kore';
const MODEL = 'gemini-2.5-flash-preview-tts';
const OUT_DIR = path.resolve('audio/glossary');

if (!API_KEY) {
  console.error('Error: Set GEMINI_API_KEY in your environment first.');
  process.exit(1);
}

function slugify(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function wrapPcm16AsWav(pcmBuf, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmBuf.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmBuf.length, 40);
  return Buffer.concat([header, pcmBuf]);
}

async function synthesize(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
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
          voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const inline = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!inline?.data) throw new Error('No audio returned');
  const pcm = Buffer.from(inline.data, 'base64');
  const rateMatch = (inline.mimeType || '').match(/rate=(\d+)/);
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  return wrapPcm16AsWav(pcm, sampleRate, 1);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const entries = Object.entries(GLOSSARY).sort((a, b) => a[0].localeCompare(b[0]));

for (let i = 0; i < entries.length; i += 1) {
  const [word, entry] = entries[i];
  const outPath = path.join(OUT_DIR, `${slugify(word)}.wav`);
  try {
    await fs.access(outPath);
    console.log(`[${i + 1}/${entries.length}] Skip existing: ${word}`);
    continue;
  } catch {
    // Generate
  }

  const text = `${word}. ${entry.definition} For example: ${entry.example}`;
  console.log(`[${i + 1}/${entries.length}] Synthesizing: ${word}...`);
  const wav = await synthesize(text);
  await fs.writeFile(outPath, wav);
  await new Promise((r) => setTimeout(r, 400));
}

console.log('Done! Generated Gemini TTS glossary audio in audio/glossary/.');

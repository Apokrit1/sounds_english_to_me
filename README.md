# Sounds English to Me

Modernized web studio for the 1994 ToolBook 3.0 Computer-Assisted Language Learning (CALL) application **"Sounds English to Me"** (*pronunciation practice for Greek learners of English*), originally authored by **Apostolos Kritsiniotis** for the MSc in Speech & Hearing Sciences at University College London (UCL), supervised by **Prof. Mark Huckvale**.

## Features
- **14 Phonemic Modules:** Example (`/t/ vs. /d/`), Units 1–12, and restored Unit 13 (`/ʊ/ vs. /uː/`) from the original 1994 PCM `.WAV` recordings.
- **4 Practice Modes per Unit:**
  1. **Explore & Contrast** (word cards, `+` sequential pair drill, alternate `*B`/`*C` tokens)
  2. **Identification Test** (2AFC/3AFC HVPT quiz with immediate error-driven contrastive replay)
  3. **AX Same / Different** (cross-token categorical discrimination)
  4. **Record & Compare Lab** (live Web Audio FFT spectrum & spectral centroid meter + `Native → You → Native` loop)
- **Greek L1 Interference Coaching:** Explains PAM-L2 mergers (e.g., Greek retracted `[s̠]` vs. English `/s, ʃ/`) and vowel-space crowding.
- **Offline PWA Support** and full preservation of the original 1994 ToolBook archive (`GLOT.TBK`, `SCRIPT.WRI`, `*.WAV`).

## Run Locally
Double-click `start-app.bat` or run:

```powershell
python -m http.server 8787 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8787`.

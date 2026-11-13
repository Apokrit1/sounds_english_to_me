import {
  UNITS,
  UNIT_MAP,
  CATEGORIES,
  SYSTEM_AUDIO,
  CREDITS_1994,
} from '../data/curriculum.js';
import { AudioEngine } from './audio-engine.js';

const STORAGE_KEY = 'sounds-english-to-me:stats:v1';

class SoundsEnglishApp {
  constructor() {
    this.audio = new AudioEngine();
    this.state = {
      view: 'contents', // 'contents' | 'unit'
      unitId: 'unit1',
      mode: 'explore', // 'explore' | 'identify' | 'ax' | 'record'
      groupIndex: 0,
      theme: localStorage.getItem('setm-theme') || 'dark',
      stats: this.loadStats(),
    };

    // Active quiz / drill states
    this.idQuiz = null;
    this.axQuiz = null;
    this.recordTarget = null;
    this.lastComparison = null;
    this.idleTimer = null;

    this.cacheDom();
    this.applyTheme(this.state.theme);
    this.bindGlobalEvents();
    this.populateDialogs();
    this.render();
    this.registerServiceWorker();
    this.resetIdleTimer();
  }

  cacheDom() {
    this.appMain = document.getElementById('app-main');
    this.liveRegion = document.getElementById('live-announcer');
    this.coachToast = document.getElementById('coach-toast');
    this.coachText = document.getElementById('coach-toast-text');
    this.themeBtn = document.getElementById('btn-theme');

    this.dialogs = {
      credits: document.getElementById('credits-dialog'),
      theory: document.getElementById('theory-dialog'),
      help: document.getElementById('help-dialog'),
      stats: document.getElementById('stats-dialog'),
    };
  }

  loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore corrupted storage
    }
    return { units: {}, totalTrials: 0, totalCorrect: 0 };
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.stats));
    } catch {
      // ignore quota errors
    }
  }

  recordTrial(unitId, mode, isCorrect, rtMs, confusedPair = null) {
    const stats = this.state.stats;
    stats.totalTrials += 1;
    if (isCorrect) stats.totalCorrect += 1;

    if (!stats.units[unitId]) {
      stats.units[unitId] = {
        identifyAttempts: 0,
        identifyCorrect: 0,
        axAttempts: 0,
        axCorrect: 0,
        totalRtMs: 0,
        rtCount: 0,
        confusions: {},
      };
    }

    const u = stats.units[unitId];
    if (mode === 'identify') {
      u.identifyAttempts += 1;
      if (isCorrect) u.identifyCorrect += 1;
    } else if (mode === 'ax') {
      u.axAttempts += 1;
      if (isCorrect) u.axCorrect += 1;
    }

    if (rtMs > 0 && rtMs < 30000) {
      u.totalRtMs += rtMs;
      u.rtCount += 1;
    }

    if (!isCorrect && confusedPair) {
      u.confusions[confusedPair] = (u.confusions[confusedPair] || 0) + 1;
    }

    this.saveStats();
  }

  applyTheme(theme) {
    this.state.theme = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('setm-theme', theme);
    if (this.themeBtn) {
      this.themeBtn.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  }

  bindGlobalEvents() {
    document.getElementById('btn-home')?.addEventListener('click', () => {
      this.navigate(() => {
        this.state.view = 'contents';
      });
    });

    this.themeBtn?.addEventListener('click', () => {
      this.applyTheme(this.state.theme === 'dark' ? 'light' : 'dark');
    });

    document.getElementById('btn-open-theory')?.addEventListener('click', () => {
      this.dialogs.theory?.showModal();
    });

    document.getElementById('btn-open-credits')?.addEventListener('click', () => {
      this.dialogs.credits?.showModal();
    });

    document.getElementById('btn-open-help')?.addEventListener('click', () => {
      this.dialogs.help?.showModal();
    });

    document.getElementById('btn-open-stats')?.addEventListener('click', () => {
      this.renderStatsDialog();
      this.dialogs.stats?.showModal();
    });

    document.getElementById('btn-dismiss-coach')?.addEventListener('click', () => {
      if (this.coachToast) this.coachToast.hidden = true;
    });

    // Close dialogs when clicking backdrop
    for (const dlg of Object.values(this.dialogs)) {
      dlg?.addEventListener('click', (e) => {
        if (e.target === dlg) dlg.close();
      });
    }

    // Track user activity for gentle coaching prompt
    ['click', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
    });

    // Keyboard shortcuts inside active quiz modes
    window.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]')) return;
      if (this.state.view !== 'unit') return;

      if (this.state.mode === 'identify' && this.idQuiz && !this.idQuiz.answered) {
        if (['1', '2', '3'].includes(e.key)) {
          const idx = Number(e.key) - 1;
          if (idx < this.idQuiz.options.length) {
            this.handleIdentifyAnswer(idx);
          }
        } else if (e.key.toLowerCase() === 'r') {
          this.playCurrentIdentifyPrompt();
        }
      } else if (this.state.mode === 'ax' && this.axQuiz && !this.axQuiz.answered) {
        if (e.key === '1' || e.key.toLowerCase() === 's') {
          this.handleAxAnswer(true);
        } else if (e.key === '2' || e.key.toLowerCase() === 'd') {
          this.handleAxAnswer(false);
        } else if (e.key.toLowerCase() === 'r') {
          this.playCurrentAxPrompt();
        }
      }
    });
  }

  resetIdleTimer() {
    clearTimeout(this.idleTimer);
    if (this.coachToast && !this.coachToast.hidden) {
      this.coachToast.hidden = true;
    }
    this.idleTimer = setTimeout(() => {
      if (!this.coachToast || !this.coachText) return;
      if (this.state.view === 'contents') {
        this.coachText.textContent =
          'Tip: Hover or click the speaker icon on any Unit card to preview the contrast, or open Unit 1 (/s/ vs. /ʃ/) to try live spectral biofeedback.';
      } else {
        this.coachText.textContent =
          'Tip: Click any word to hear it, click + to hear the minimal pair back-to-back, or switch to Identification Test to check your perception.';
      }
      this.coachToast.hidden = false;
    }, 30000);
  }

  announce(msg) {
    if (this.liveRegion) {
      this.liveRegion.textContent = msg;
    }
  }

  navigate(mutateState) {
    this.audio.stopAll();
    const run = () => {
      mutateState();
      this.render();
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    if (document.startViewTransition) {
      document.startViewTransition(run);
    } else {
      run();
    }
  }

  populateDialogs() {
    const creditsContainer = document.getElementById('credits-content');
    if (creditsContainer) {
      creditsContainer.innerHTML = `
        <p><strong>${CREDITS_1994.title}</strong> — <em>${CREDITS_1994.subtitle}</em></p>
        <p>Originally authored in <strong>ToolBook 3.0 (${CREDITS_1994.year})</strong> by <strong>${CREDITS_1994.author}</strong> for the <strong>${CREDITS_1994.degree}</strong>.</p>
        <blockquote class="credits-quote">${CREDITS_1994.creditsText}</blockquote>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">${CREDITS_1994.copyrightNote}</p>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
          <button class="btn btn-primary btn-sm" id="btn-play-welcome">▶ Play 1994 Welcome (WELLCOME.WAV)</button>
          <button class="btn btn-sm" id="btn-play-intro">▶ Play Full Intro (10.2s · INTRO.WAV)</button>
          <button class="btn btn-sm" id="btn-play-p">▶ Play P.WAV</button>
        </div>
      `;
      document.getElementById('btn-play-welcome')?.addEventListener('click', () => {
        this.audio.playFile(SYSTEM_AUDIO.welcome);
      });
      document.getElementById('btn-play-intro')?.addEventListener('click', () => {
        this.audio.playFile(SYSTEM_AUDIO.intro);
      });
      document.getElementById('btn-play-p')?.addEventListener('click', () => {
        this.audio.playFile(SYSTEM_AUDIO.p);
      });
    }

    document.getElementById('btn-play-okey')?.addEventListener('click', () => {
      this.audio.playFile(SYSTEM_AUDIO.okey);
    });

    document.getElementById('btn-reset-stats')?.addEventListener('click', () => {
      this.state.stats = { units: {}, totalTrials: 0, totalCorrect: 0 };
      this.saveStats();
      this.renderStatsDialog();
      this.render();
    });
  }

  renderStatsDialog() {
    const body = document.getElementById('stats-body');
    if (!body) return;

    const { totalTrials, totalCorrect, units } = this.state.stats;
    const overallAcc = totalTrials > 0 ? Math.round((totalCorrect / totalTrials) * 100) : 0;

    const rowsHtml = UNITS.map((u) => {
      const s = units[u.id];
      if (!s || (s.identifyAttempts === 0 && s.axAttempts === 0)) {
        return `
          <tr>
            <td><strong>${u.badge}</strong> <span style="color:var(--text-secondary)">${u.title}</span></td>
            <td class="mono">—</td>
            <td class="mono">—</td>
            <td class="mono">—</td>
            <td style="color:var(--text-muted)">Not practiced yet</td>
          </tr>
        `;
      }
      const idAcc = s.identifyAttempts
        ? `${Math.round((s.identifyCorrect / s.identifyAttempts) * 100)}% (${s.identifyCorrect}/${s.identifyAttempts})`
        : '—';
      const axAcc = s.axAttempts
        ? `${Math.round((s.axCorrect / s.axAttempts) * 100)}% (${s.axCorrect}/${s.axAttempts})`
        : '—';
      const avgRt = s.rtCount ? `${Math.round(s.totalRtMs / s.rtCount)} ms` : '—';
      const topConf = Object.entries(s.confusions || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k, v]) => `${k} (×${v})`)
        .join(', ');

      return `
        <tr>
          <td><strong>${u.badge}</strong> <span style="color:var(--text-secondary)">${u.title}</span></td>
          <td class="mono">${idAcc}</td>
          <td class="mono">${axAcc}</td>
          <td class="mono">${avgRt}</td>
          <td>${topConf || 'None'}</td>
        </tr>
      `;
    }).join('');

    body.innerHTML = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap;">
        <div class="interference-box" style="flex:1">
          <h4>Total Trials</h4>
          <p class="mono" style="font-size:1.3rem; color:var(--text-primary); font-weight:700;">${totalTrials}</p>
        </div>
        <div class="interference-box" style="flex:1">
          <h4>Overall Accuracy</h4>
          <p class="mono" style="font-size:1.3rem; color:var(--accent-success); font-weight:700;">${totalTrials ? overallAcc + '%' : '—'}</p>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Identification</th>
              <th>AX Discrimination</th>
              <th>Mean RT</th>
              <th>Top L1 Confusions</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  render() {
    if (this.state.view === 'contents') {
      this.renderContentsView();
    } else {
      this.renderUnitView();
    }
  }

  getUnitAccuracyText(unitId) {
    const s = this.state.stats.units[unitId];
    if (!s) return '';
    const attempts = s.identifyAttempts + s.axAttempts;
    const correct = s.identifyCorrect + s.axCorrect;
    if (!attempts) return '';
    return `${Math.round((correct / attempts) * 100)}%`;
  }

  renderContentsView() {
    const totalPairs = UNITS.reduce(
      (acc, u) => acc + u.groups.reduce((gAcc, g) => gAcc + g.items.length, 0),
      0
    );
    const practicedCount = Object.values(this.state.stats.units).filter(
      (s) => s.identifyAttempts + s.axAttempts > 0
    ).length;
    const overallAcc =
      this.state.stats.totalTrials > 0
        ? `${Math.round((this.state.stats.totalCorrect / this.state.stats.totalTrials) * 100)}%`
        : '—';

    const sectionsHtml = CATEGORIES.map((cat) => {
      const catUnits = UNITS.filter((u) => u.category === cat.id);
      const cardsHtml = catUnits
        .map((u) => {
          const acc = this.getUnitAccuracyText(u.id);
          return `
            <article class="unit-card" data-unit-id="${u.id}">
              <div class="unit-card-top">
                <span class="unit-badge ${u.restored ? 'is-restored' : ''}">${u.badge}</span>
                ${acc ? `<span class="unit-accuracy-pill" title="Your accuracy">${acc}</span>` : ''}
              </div>
              <h3 class="unit-ipa">${u.title}</h3>
              <p class="unit-exemplar">${u.subtitle}</p>
              <p class="unit-pam">${u.pamType}</p>
              <div class="unit-card-actions">
                <button class="btn btn-primary btn-sm" data-open-unit="${u.id}">Open Studio</button>
                <button
                  class="btn btn-sm"
                  data-preview-unit="${u.id}"
                  title="Listen to unit introduction"
                  aria-label="Listen to ${u.badge} preview"
                >▶ Preview</button>
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <section class="category-section">
          <div class="category-header">
            <h2>${cat.title}</h2>
            <p>${cat.description}</p>
          </div>
          <div class="unit-grid">${cardsHtml}</div>
        </section>
      `;
    }).join('');

    this.appMain.innerHTML = `
      <section class="hero-card">
        <div>
          <div class="hero-eyebrow">1994 UCL MSc Speech &amp; Hearing Sciences · Modernized Web Studio</div>
          <h1 class="hero-title">Sounds English to Me</h1>
          <p class="hero-desc">
            Minimal-pair &amp; High Variability Phonetic Training (HVPT) targeting Greek L1 interference in English
            consonants, sibilants, weak syllables, and vowel space. Restores all 12 original ToolBook 3 units,
            unlocks the unlinked Unit 13 (/ʊ/ vs. /uː/) and multi-token (*B/*C) recordings, and adds live acoustic
            spectral biofeedback.
          </p>
          <div class="hero-controls">
            <button class="btn btn-primary" id="btn-hero-welcome">▶ Play 1994 Welcome</button>
            <button class="btn" id="btn-hero-intro">▶ Full Spoken Intro (10s)</button>
            <button class="btn" id="btn-hero-start-u1">Start with Unit 1 (/s/ vs. /ʃ/)</button>
          </div>
        </div>
        <aside class="hero-stats-box" aria-label="Course progress summary">
          <div class="stat-line"><span>Phonemic Modules</span><strong>${UNITS.length} Units</strong></div>
          <div class="stat-line"><span>Minimal Contrasts</span><strong>${totalPairs} Sets</strong></div>
          <div class="stat-line"><span>Units Practiced</span><strong>${practicedCount} / ${UNITS.length}</strong></div>
          <div class="stat-line"><span>Overall Accuracy</span><strong>${overallAcc}</strong></div>
        </aside>
      </section>
      ${sectionsHtml}
    `;

    document.getElementById('btn-hero-welcome')?.addEventListener('click', () => {
      this.audio.playFile(SYSTEM_AUDIO.welcome);
    });
    document.getElementById('btn-hero-intro')?.addEventListener('click', () => {
      this.audio.playFile(SYSTEM_AUDIO.intro);
    });
    document.getElementById('btn-hero-start-u1')?.addEventListener('click', () => {
      this.openUnit('unit1');
    });

    this.appMain.querySelectorAll('[data-open-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.openUnit(btn.dataset.openUnit);
      });
    });

    this.appMain.querySelectorAll('[data-preview-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const unit = UNIT_MAP.get(btn.dataset.previewUnit);
        if (!unit) return;
        btn.classList.add('is-playing');
        this.audio.playSequence(unit.unitAudio, 180).finally(() => {
          btn.classList.remove('is-playing');
        });
      });
    });
  }

  openUnit(unitId, mode = 'explore') {
    const unit = UNIT_MAP.get(unitId) || UNITS[0];
    this.idQuiz = null;
    this.axQuiz = null;
    this.recordTarget = null;
    this.navigate(() => {
      this.state.view = 'unit';
      this.state.unitId = unit.id;
      this.state.mode = mode;
      this.state.groupIndex = 0;
    });

    // Preload WAVs for snappy playback
    const wavs = [...unit.unitAudio];
    for (const g of unit.groups) {
      for (const item of g.items) {
        for (const w of item.words) {
          wavs.push(w.wav, ...(w.altWavs || []));
        }
      }
    }
    this.audio.preload(wavs);
  }

  renderUnitView() {
    const unit = UNIT_MAP.get(this.state.unitId) || UNITS[0];
    const currentIdx = UNITS.findIndex((u) => u.id === unit.id);
    const prevUnit = currentIdx > 0 ? UNITS[currentIdx - 1] : null;
    const nextUnit = currentIdx < UNITS.length - 1 ? UNITS[currentIdx + 1] : null;

    const phonemesHtml = unit.phonemes
      .map(
        (p, idx) => `
          <button
            class="phoneme-chip"
            data-phoneme-audio="${p.audio}"
            popovertarget="cue-popover-${idx}"
            title="Play ${p.ipa} reference & view articulation"
          >
            <span class="chip-ipa">${p.ipa}</span>
            <span>${p.label}</span>
            <span class="chip-hz">${p.frequencyHint}</span>
          </button>
          <div id="cue-popover-${idx}" popover="auto" class="cue-popover">
            <h4 style="margin:0 0 0.35rem; font-family:var(--font-mono); color:var(--accent-primary);">
              ${p.ipa} — ${p.label}
            </h4>
            <p style="margin:0 0 0.45rem; font-size:0.88rem;">${p.articulation}</p>
            <p style="margin:0; font-size:0.8rem; color:var(--text-secondary);">
              Acoustic cue: <strong>${p.frequencyHint}</strong>
            </p>
          </div>
        `
      )
      .join('');

    this.appMain.innerHTML = `
      <div class="studio-topbar">
        <div class="studio-nav-group">
          <button class="btn btn-sm" id="btn-back-contents">← Contents</button>
          <button class="btn btn-sm" id="btn-prev-unit" ${!prevUnit ? 'disabled' : ''}>
            ‹ ${prevUnit ? prevUnit.badge : 'Start'}
          </button>
          <button class="btn btn-sm" id="btn-next-unit" ${!nextUnit ? 'disabled' : ''}>
            ${nextUnit ? nextUnit.badge : 'End'} ›
          </button>
        </div>
        <button class="btn btn-sm" id="btn-play-unit-banner">▶ Unit Audio (${unit.badge})</button>
      </div>

      <section class="studio-header-card">
        <div class="studio-title-row">
          <h1 class="studio-title">
            <span class="unit-badge ${unit.restored ? 'is-restored' : ''}">${unit.badge}</span>
            <span class="ipa-title">${unit.title}</span>
            <span style="font-weight:400; font-size:1rem; color:var(--text-secondary);">(${unit.subtitle})</span>
          </h1>
          <span class="unit-pam">${unit.pamType}</span>
        </div>

        <div class="phoneme-pills">${phonemesHtml}</div>

        <div class="interference-panel">
          <div class="interference-box is-trap">
            <h4>Greek L1 Interference</h4>
            <p>${unit.l1Interference.summary}</p>
          </div>
          <div class="interference-box">
            <h4>Acoustic Contrast Target</h4>
            <p>${unit.l1Interference.englishTarget}</p>
          </div>
          <div class="interference-box is-tip">
            <h4>Articulatory &amp; Listening Cue</h4>
            <p>${unit.l1Interference.coachingTip}</p>
          </div>
        </div>
      </section>

      <div class="mode-tabs" role="tablist" aria-label="Practice modes">
        <button class="mode-tab" role="tab" data-mode="explore" aria-selected="${this.state.mode === 'explore'}">
          1. Explore &amp; Contrast
        </button>
        <button class="mode-tab" role="tab" data-mode="identify" aria-selected="${this.state.mode === 'identify'}">
          2. Identification Test
        </button>
        <button class="mode-tab" role="tab" data-mode="ax" aria-selected="${this.state.mode === 'ax'}">
          3. AX Same / Different
        </button>
        <button class="mode-tab" role="tab" data-mode="record" aria-selected="${this.state.mode === 'record'}">
          4. Record &amp; Compare
        </button>
      </div>

      <div class="studio-workspace">
        <section class="studio-panel" id="mode-panel"></section>
        <aside class="studio-panel biofeedback-card" aria-label="Real-time acoustic visualizer">
          <div class="biofeedback-header">
            <h3>Acoustic Spectrum &amp; Waveform</h3>
            <span class="centroid-readout" id="centroid-readout">Centroid: — Hz</span>
          </div>
          <canvas id="spectrum-canvas" class="spectrum-canvas" width="460" height="195"></canvas>
          <p class="biofeedback-caption" id="biofeedback-caption">
            ${this.getVisualizerCaption(unit.l1Interference.spectralMode)}
          </p>
        </aside>
      </div>
    `;

    // Bind navigation
    document.getElementById('btn-back-contents')?.addEventListener('click', () => {
      this.navigate(() => {
        this.state.view = 'contents';
      });
    });
    if (prevUnit) {
      document.getElementById('btn-prev-unit')?.addEventListener('click', () => {
        this.openUnit(prevUnit.id, this.state.mode);
      });
    }
    if (nextUnit) {
      document.getElementById('btn-next-unit')?.addEventListener('click', () => {
        this.openUnit(nextUnit.id, this.state.mode);
      });
    }
    document.getElementById('btn-play-unit-banner')?.addEventListener('click', () => {
      this.audio.playSequence(unit.unitAudio, 180);
    });

    // Phoneme chips play sound as well as opening popover
    this.appMain.querySelectorAll('[data-phoneme-audio]').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.audio.playFile(chip.dataset.phonemeAudio);
      });
    });

    // Mode tabs
    this.appMain.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const nextMode = tab.dataset.mode;
        if (nextMode === this.state.mode) return;
        this.audio.stopAll();
        this.state.mode = nextMode;
        this.appMain.querySelectorAll('.mode-tab').forEach((t) => {
          t.setAttribute('aria-selected', String(t.dataset.mode === nextMode));
        });
        this.renderActiveModePanel(unit);
      });
    });

    // Attach visualizer canvas
    const canvas = document.getElementById('spectrum-canvas');
    const readout = document.getElementById('centroid-readout');
    this.audio.setVisualizer(canvas, unit.l1Interference.spectralMode, ({ centroidHz }) => {
      if (readout && centroidHz) {
        readout.textContent = `Centroid: ${centroidHz} Hz`;
      }
    });

    this.renderActiveModePanel(unit);
  }

  getVisualizerCaption(mode) {
    if (mode === 'sibilant') {
      return 'Target zones: /ʃ/ peaks around 2.5–3.8 kHz; Greek retracted [s̠] traps near 4.2–5.5 kHz; English /s/ peaks above 6 kHz.';
    }
    if (mode === 'vowel') {
      return 'Focused 0–4 kHz vowel formant window showing F1 (jaw openness) & F2 (tongue frontness) energy distribution.';
    }
    if (mode === 'vot') {
      return 'Watch the upper white waveform for silent stop-closure gaps and release bursts (VOT / aspiration).';
    }
    return 'Compare nasal resonance energy vs. final /k/ release burst in the waveform & spectrum.';
  }

  renderActiveModePanel(unit) {
    const panel = document.getElementById('mode-panel');
    if (!panel) return;

    if (this.state.mode === 'explore') {
      this.renderExploreMode(panel, unit);
    } else if (this.state.mode === 'identify') {
      this.renderIdentifyMode(panel, unit);
    } else if (this.state.mode === 'ax') {
      this.renderAxMode(panel, unit);
    } else if (this.state.mode === 'record') {
      this.renderRecordMode(panel, unit);
    }
  }

  renderExploreMode(panel, unit) {
    const groups = unit.groups;
    const activeGroup = groups[this.state.groupIndex] || groups[0];

    const subgroupPills =
      groups.length > 1
        ? `<div class="subgroup-pills">
            ${groups
              .map(
                (g, i) => `
                <button class="subgroup-pill" data-group-idx="${i}" aria-pressed="${i === this.state.groupIndex}">
                  ${g.label}
                </button>`
              )
              .join('')}
          </div>`
        : `<strong style="font-size:0.95rem;">${activeGroup.label}</strong>`;

    const rowsHtml = activeGroup.items
      .map((item, rowIdx) => {
        const isTriplet = item.words.length > 2;
        const wordCardsHtml = item.words
          .map((w, wIdx) => {
            const altButtons = (w.altWavs || [])
              .map(
                (altWav, aIdx) => `
                  <button class="token-chip" data-wav="${altWav}" title="Alternate acoustic token (${altWav})">
                    Token ${String.fromCharCode(66 + aIdx)}
                  </button>`
              )
              .join('');

            return `
              <div class="word-card">
                <button class="word-btn" data-wav="${w.wav}" id="word-${rowIdx}-${wIdx}">
                  <span class="word-text">${w.text}</span>
                  <span class="word-ipa">${w.ipa}</span>
                </button>
                ${altButtons ? `<div class="token-row">${altButtons}</div>` : ''}
              </div>
            `;
          })
          .join(isTriplet ? '' : `<!--plus-slot-->`);

        const plusBtnHtml = `
          <button
            class="plus-contrast-btn"
            data-pair-wavs="${item.words.map((w) => w.wav).join(',')}"
            title="Hear ${item.words.map((w) => w.text).join(' → ')} contrast"
            aria-label="Hear contrast ${item.words.map((w) => w.text).join(' and ')}"
          >+</button>
        `;

        const inner = isTriplet
          ? `${wordCardsHtml}${plusBtnHtml}`
          : wordCardsHtml.replace('<!--plus-slot-->', plusBtnHtml);

        return `<div class="pair-row ${isTriplet ? 'is-triplet' : ''}">${inner}</div>`;
      })
      .join('');

    panel.innerHTML = `
      <div class="subgroup-bar">
        ${subgroupPills}
        <button class="btn btn-sm" id="btn-pair-drill">▶ Auto Pair Drill</button>
      </div>
      <div class="pairs-list">${rowsHtml}</div>
    `;

    panel.querySelectorAll('[data-group-idx]').forEach((pill) => {
      pill.addEventListener('click', () => {
        this.state.groupIndex = Number(pill.dataset.groupIdx);
        this.renderExploreMode(panel, unit);
      });
    });

    panel.querySelectorAll('[data-wav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.is-playing').forEach((el) => el.classList.remove('is-playing'));
        btn.classList.add('is-playing');
        this.audio.playFile(btn.dataset.wav).finally(() => {
          btn.classList.remove('is-playing');
        });
      });
    });

    panel.querySelectorAll('.plus-contrast-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wavs = btn.dataset.pairWavs.split(',');
        const row = btn.closest('.pair-row');
        const wordBtns = row ? [...row.querySelectorAll('.word-btn')] : [];
        btn.classList.add('is-playing');

        this.audio
          .playSequence(wavs, 230, {
            onStepStart: (i) => {
              wordBtns.forEach((wb, idx) => wb.classList.toggle('is-playing', idx === i));
            },
            onStepEnd: () => {
              wordBtns.forEach((wb) => wb.classList.remove('is-playing'));
            },
          })
          .finally(() => {
            btn.classList.remove('is-playing');
            wordBtns.forEach((wb) => wb.classList.remove('is-playing'));
          });
      });
    });

    document.getElementById('btn-pair-drill')?.addEventListener('click', () => {
      const seq = [SYSTEM_AUDIO.pairDrill];
      for (const item of activeGroup.items) {
        for (const w of item.words) {
          seq.push(w.wav);
        }
      }
      this.audio.playSequence(seq, 280);
    });
  }

  /* ========================================================================
     Mode 2: Identification Test (2AFC / 3AFC HVPT Quiz)
     ======================================================================== */

  getAllPairsForUnit(unit) {
    // Combine all unique pairs/triplets across subgroups so full unit is tested
    const seen = new Set();
    const list = [];
    for (const g of unit.groups) {
      for (const item of g.items) {
        const key = item.words.map((w) => w.text).join('|');
        if (!seen.has(key)) {
          seen.add(key);
          list.push(item);
        }
      }
    }
    return list;
  }

  pickTokenForWord(word) {
    const pool = [word.wav, ...(word.altWavs || [])];
    const idx = Math.floor(Math.random() * pool.length);
    return {
      wav: pool[idx],
      isAltToken: idx > 0,
      tokenLabel: idx === 0 ? 'Token A' : `Token ${String.fromCharCode(65 + idx)}`,
    };
  }

  startNextIdentifyQuestion(unit, autoPlay = true) {
    const pool = this.getAllPairsForUnit(unit);
    const item = pool[Math.floor(Math.random() * pool.length)];
    const targetIdx = Math.floor(Math.random() * item.words.length);
    const targetWord = item.words[targetIdx];
    const chosenToken = this.pickTokenForWord(targetWord);

    this.idQuiz = {
      item,
      options: item.words,
      targetIdx,
      targetWord,
      promptWav: chosenToken.wav,
      tokenLabel: chosenToken.tokenLabel,
      isAltToken: chosenToken.isAltToken,
      answered: false,
      selectedIdx: null,
      startedAt: performance.now(),
      score: this.idQuiz?.score ?? 0,
      total: this.idQuiz?.total ?? 0,
      streak: this.idQuiz?.streak ?? 0,
    };

    const panel = document.getElementById('mode-panel');
    if (panel) this.renderIdentifyMode(panel, unit, false);
    if (autoPlay) {
      this.playCurrentIdentifyPrompt();
    }
  }

  playCurrentIdentifyPrompt() {
    if (!this.idQuiz) return;
    this.audio.playFile(this.idQuiz.promptWav).then(() => {
      if (this.idQuiz && !this.idQuiz.answered) {
        this.idQuiz.startedAt = performance.now();
      }
    });
  }

  handleIdentifyAnswer(choiceIdx) {
    if (!this.idQuiz || this.idQuiz.answered) return;
    const unit = UNIT_MAP.get(this.state.unitId);
    const rtMs = Math.round(performance.now() - this.idQuiz.startedAt);
    const isCorrect = choiceIdx === this.idQuiz.targetIdx;

    this.idQuiz.answered = true;
    this.idQuiz.selectedIdx = choiceIdx;
    this.idQuiz.total += 1;

    if (isCorrect) {
      this.idQuiz.score += 1;
      this.idQuiz.streak += 1;
      this.recordTrial(unit.id, 'identify', true, rtMs);
      const fbClip =
        this.idQuiz.streak > 0 && this.idQuiz.streak % 5 === 0
          ? 'WELLDONE.WAV'
          : SYSTEM_AUDIO.correct[Math.floor(Math.random() * SYSTEM_AUDIO.correct.length)];
      this.audio.playFile(fbClip);
      this.announce(`Correct! ${this.idQuiz.targetWord.text}.`);
    } else {
      this.idQuiz.streak = 0;
      const chosenWord = this.idQuiz.options[choiceIdx];
      const confKey = `${this.idQuiz.targetWord.text} vs ${chosenWord.text}`;
      this.recordTrial(unit.id, 'identify', false, rtMs, confKey);
      const fbClip =
        SYSTEM_AUDIO.incorrect[Math.floor(Math.random() * SYSTEM_AUDIO.incorrect.length)];
      this.audio.playFile(fbClip);
      this.announce(`Not quite. The word was ${this.idQuiz.targetWord.text}.`);
    }

    const panel = document.getElementById('mode-panel');
    if (panel) this.renderIdentifyMode(panel, unit, false);
  }

  renderIdentifyMode(panel, unit, initIfMissing = true) {
    if (!this.idQuiz && initIfMissing) {
      this.startNextIdentifyQuestion(unit, true);
      return;
    }
    const q = this.idQuiz;
    const acc = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;

    const optionsHtml = q.options
      .map((w, idx) => {
        let stateAttr = '';
        if (q.answered) {
          if (idx === q.targetIdx) stateAttr = 'data-state="correct"';
          else if (idx === q.selectedIdx) stateAttr = 'data-state="wrong"';
        }
        return `
          <button class="quiz-option-btn" data-choice-idx="${idx}" ${stateAttr} ${q.answered ? 'disabled' : ''}>
            <span class="opt-word">${w.text}</span>
            <span class="opt-ipa">${w.ipa}</span>
            <span style="font-size:0.72rem; color:var(--text-muted);">Key ${idx + 1}</span>
          </button>
        `;
      })
      .join('');

    let feedbackHtml = '';
    if (q.answered) {
      const isRight = q.selectedIdx === q.targetIdx;
      const contrastiveWavs = q.options.map((w) => w.wav);
      feedbackHtml = `
        <div class="feedback-banner ${isRight ? 'is-correct' : 'is-wrong'}">
          <div>
            <strong>${isRight ? 'Correct!' : `You clicked "${q.options[q.selectedIdx].text}" — target was "${q.targetWord.text}".`}</strong>
            <div style="font-size:0.82rem; color:var(--text-secondary);">
              ${isRight ? 'Nice categorical discrimination.' : 'Listen to the pair side-by-side right now to recalibrate the contrast.'}
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
            <button class="btn btn-sm" id="btn-id-contrast">▶ Hear Contrast (${q.options.map((w) => w.text).join(' ↔ ')})</button>
            <button class="btn btn-primary btn-sm" id="btn-id-next">Next Question →</button>
          </div>
        </div>
      `;
      setTimeout(() => {
        document.getElementById('btn-id-contrast')?.addEventListener('click', () => {
          this.audio.playSequence(contrastiveWavs, 240);
        });
        document.getElementById('btn-id-next')?.addEventListener('click', () => {
          this.startNextIdentifyQuestion(unit, true);
        });
      }, 0);
    }

    panel.innerHTML = `
      <div class="quiz-stage">
        <div class="quiz-meta-bar">
          <span>Score: <span class="mono">${q.score} / ${q.total}</span> (${q.total ? acc + '%' : '—'})</span>
          <span>Streak: <span class="mono">${q.streak}</span></span>
          <span>Source: <span class="mono">${q.tokenLabel}${q.isAltToken ? ' (Cross-Token HVPT)' : ''}</span></span>
        </div>

        <div class="quiz-prompt-box">
          <h3>Now click on the word you heard</h3>
          <p>Press <kbd>R</kbd> to replay, or <kbd>1</kbd>–<kbd>${q.options.length}</kbd> to answer.</p>
          <button class="btn btn-primary" id="btn-id-replay">▶ Replay Target Word</button>
        </div>

        <div class="quiz-options-grid">${optionsHtml}</div>
        ${feedbackHtml}
      </div>
    `;

    document.getElementById('btn-id-replay')?.addEventListener('click', () => {
      this.playCurrentIdentifyPrompt();
    });

    panel.querySelectorAll('[data-choice-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.handleIdentifyAnswer(Number(btn.dataset.choiceIdx));
      });
    });
  }

  /* ========================================================================
     Mode 3: AX Categorical Discrimination (Same vs. Different)
     ======================================================================== */

  startNextAxQuestion(unit, autoPlay = true) {
    const pool = this.getAllPairsForUnit(unit);
    const item = pool[Math.floor(Math.random() * pool.length)];
    const isSame = Math.random() < 0.5;

    let wordA;
    let wordB;
    let wavA;
    let wavB;
    let rateB = 1.0;
    let tokenNote = '';

    if (isSame) {
      const idx = Math.floor(Math.random() * item.words.length);
      wordA = item.words[idx];
      wordB = item.words[idx];
      const allTokens = [wordA.wav, ...(wordA.altWavs || [])];
      if (allTokens.length >= 2) {
        wavA = allTokens[0];
        wavB = allTokens[1 + Math.floor(Math.random() * (allTokens.length - 1))];
        tokenNote = 'Cross-token pair (different recording of same word)';
      } else {
        wavA = wordA.wav;
        wavB = wordA.wav;
        // Slight rate perturbation so learner cannot match identical raw timing
        rateB = 0.93;
        tokenNote = 'Rate-varied token (tests phoneme category over duration)';
      }
    } else {
      const idxA = Math.floor(Math.random() * item.words.length);
      let idxB = Math.floor(Math.random() * item.words.length);
      while (idxB === idxA) {
        idxB = Math.floor(Math.random() * item.words.length);
      }
      wordA = item.words[idxA];
      wordB = item.words[idxB];
      wavA = this.pickTokenForWord(wordA).wav;
      wavB = this.pickTokenForWord(wordB).wav;
      tokenNote = 'Contrasting phoneme pair';
    }

    this.axQuiz = {
      item,
      isSame,
      wordA,
      wordB,
      wavA,
      wavB,
      rateB,
      tokenNote,
      answered: false,
      userSaidSame: null,
      startedAt: performance.now(),
      score: this.axQuiz?.score ?? 0,
      total: this.axQuiz?.total ?? 0,
    };

    const panel = document.getElementById('mode-panel');
    if (panel) this.renderAxMode(panel, unit, false);
    if (autoPlay) {
      this.playCurrentAxPrompt();
    }
  }

  async playCurrentAxPrompt() {
    if (!this.axQuiz) return;
    const { wavA, wavB, rateB } = this.axQuiz;
    this.audio.stopAll();
    const token = this.audio.sequenceToken;
    await this.audio.playFile(wavA, { interrupt: false });
    if (token !== this.audio.sequenceToken) return;
    await new Promise((r) => setTimeout(r, 340));
    if (token !== this.audio.sequenceToken) return;
    await this.audio.playFile(wavB, { interrupt: false, playbackRate: rateB });
    if (this.axQuiz && !this.axQuiz.answered) {
      this.axQuiz.startedAt = performance.now();
    }
  }

  handleAxAnswer(saidSame) {
    if (!this.axQuiz || this.axQuiz.answered) return;
    const unit = UNIT_MAP.get(this.state.unitId);
    const rtMs = Math.round(performance.now() - this.axQuiz.startedAt);
    const isCorrect = saidSame === this.axQuiz.isSame;

    this.axQuiz.answered = true;
    this.axQuiz.userSaidSame = saidSame;
    this.axQuiz.total += 1;
    if (isCorrect) {
      this.axQuiz.score += 1;
      this.recordTrial(unit.id, 'ax', true, rtMs);
      this.audio.playFile('CORRECT.WAV');
    } else {
      const confKey = `${this.axQuiz.wordA.text} / ${this.axQuiz.wordB.text}`;
      this.recordTrial(unit.id, 'ax', false, rtMs, confKey);
      this.audio.playFile('AREUSURE.WAV');
    }

    const panel = document.getElementById('mode-panel');
    if (panel) this.renderAxMode(panel, unit, false);
  }

  renderAxMode(panel, unit, initIfMissing = true) {
    if (!this.axQuiz && initIfMissing) {
      this.startNextAxQuestion(unit, true);
      return;
    }
    const q = this.axQuiz;
    const acc = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;

    let feedbackHtml = '';
    if (q.answered) {
      const isRight = q.userSaidSame === q.isSame;
      feedbackHtml = `
        <div class="feedback-banner ${isRight ? 'is-correct' : 'is-wrong'}">
          <div>
            <strong>${isRight ? 'Correct!' : 'Incorrect.'} Word 1 was "${q.wordA.text}" (${q.wordA.ipa}) · Word 2 was "${q.wordB.text}" (${q.wordB.ipa}).</strong>
            <div style="font-size:0.82rem; color:var(--text-secondary);">${q.tokenNote}</div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-sm" id="btn-ax-replay-2">▶ Replay Pair</button>
            <button class="btn btn-primary btn-sm" id="btn-ax-next">Next Pair →</button>
          </div>
        </div>
      `;
      setTimeout(() => {
        document.getElementById('btn-ax-replay-2')?.addEventListener('click', () => {
          this.playCurrentAxPrompt();
        });
        document.getElementById('btn-ax-next')?.addEventListener('click', () => {
          this.startNextAxQuestion(unit, true);
        });
      }, 0);
    }

    panel.innerHTML = `
      <div class="quiz-stage">
        <div class="quiz-meta-bar">
          <span>AX Score: <span class="mono">${q.score} / ${q.total}</span> (${q.total ? acc + '%' : '—'})</span>
          <span>Target Contrast: <span class="mono">${unit.title}</span></span>
        </div>

        <div class="quiz-prompt-box">
          <h3>Are these two recordings the SAME word or DIFFERENT words?</h3>
          <p>Trains phonemic categorization across acoustic tokens rather than raw waveform matching.</p>
          <button class="btn btn-primary" id="btn-ax-replay">▶ Play A → X Pair</button>
        </div>

        <div class="quiz-options-grid">
          <button
            class="quiz-option-btn"
            id="btn-ax-same"
            ${q.answered && q.isSame ? 'data-state="correct"' : q.answered && q.userSaidSame === true && !q.isSame ? 'data-state="wrong"' : ''}
            ${q.answered ? 'disabled' : ''}
          >
            <span class="opt-word">Same Word</span>
            <span class="opt-ipa">Key 1 / S</span>
          </button>
          <button
            class="quiz-option-btn"
            id="btn-ax-diff"
            ${q.answered && !q.isSame ? 'data-state="correct"' : q.answered && q.userSaidSame === false && q.isSame ? 'data-state="wrong"' : ''}
            ${q.answered ? 'disabled' : ''}
          >
            <span class="opt-word">Different Words</span>
            <span class="opt-ipa">Key 2 / D</span>
          </button>
        </div>

        ${feedbackHtml}
      </div>
    `;

    document.getElementById('btn-ax-replay')?.addEventListener('click', () => {
      this.playCurrentAxPrompt();
    });
    document.getElementById('btn-ax-same')?.addEventListener('click', () => {
      this.handleAxAnswer(true);
    });
    document.getElementById('btn-ax-diff')?.addEventListener('click', () => {
      this.handleAxAnswer(false);
    });
  }

  /* ========================================================================
     Mode 4: Record & Compare Lab (Model -> You -> Model)
     ======================================================================== */

  renderRecordMode(panel, unit) {
    const pool = this.getAllPairsForUnit(unit);
    if (!this.recordTarget || !pool.includes(this.recordTarget)) {
      this.recordTarget = pool[0];
    }
    const targetWords = this.recordTarget.words;
    if (!this.selectedRecWord || !targetWords.includes(this.selectedRecWord)) {
      this.selectedRecWord = targetWords[0];
    }

    const pairOptionsHtml = pool
      .map(
        (item, i) => `
        <option value="${i}" ${item === this.recordTarget ? 'selected' : ''}>
          ${item.words.map((w) => w.text).join(' vs. ')}
        </option>`
      )
      .join('');

    const wordChipsHtml = targetWords
      .map(
        (w, i) => `
        <button
          class="subgroup-pill"
          data-rec-word-idx="${i}"
          aria-pressed="${w === this.selectedRecWord}"
        >
          ${w.text} (${w.ipa})
        </button>`
      )
      .join('');

    panel.innerHTML = `
      <div class="record-lab">
        <div class="subgroup-bar">
          <label style="font-size:0.88rem; font-weight:600;">
            Practice Contrast:
            <select id="rec-pair-select" class="btn btn-sm" style="margin-left:0.4rem;">
              ${pairOptionsHtml}
            </select>
          </label>
          <button class="btn btn-sm" id="btn-have-a-go">▶ "Have a go!" Prompt</button>
        </div>

        <div class="subgroup-pills">${wordChipsHtml}</div>

        <div class="quiz-prompt-box">
          <h3>Active Target: <span style="color:var(--accent-primary)">${this.selectedRecWord.text}</span> <span style="font-family:var(--font-mono)">${this.selectedRecWord.ipa}</span></h3>
          <p>1. Listen to Frederica's 1994 model · 2. Hold or toggle Record and say the word · 3. Compare side-by-side on the Spectrum Meter.</p>

          <div class="record-controls" style="justify-content:center;">
            <button class="btn" id="btn-rec-play-native">▶ Play Native Model</button>
            <button class="btn ${this.audio.isRecording ? 'btn-record-active' : 'btn-primary'}" id="btn-rec-toggle">
              ${this.audio.isRecording ? '■ Stop Recording' : '● Record Your Voice'}
            </button>
            <button class="btn" id="btn-rec-play-user" ${!this.audio.userBuffer ? 'disabled' : ''}>
              ▶ Play Yours
            </button>
            <button class="btn btn-primary" id="btn-rec-compare" ${!this.audio.userBuffer ? 'disabled' : ''}>
              ⇄ Compare (Native → You → Native)
            </button>
          </div>
          <p id="rec-status" style="margin-top:0.75rem; margin-bottom:0; font-size:0.82rem; color:var(--text-secondary);">
            ${this.audio.userBuffer ? 'Recording captured! Click "Compare" to hear Native → You → Native.' : 'No microphone recording captured yet.'}
          </p>
        </div>

        ${this.renderComparisonCard()}
      </div>
    `;

    document.getElementById('rec-pair-select')?.addEventListener('change', (e) => {
      this.recordTarget = pool[Number(e.target.value)];
      this.selectedRecWord = this.recordTarget.words[0];
      this.lastComparison = null;
      this.renderRecordMode(panel, unit);
    });

    panel.querySelectorAll('[data-rec-word-idx]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        this.selectedRecWord = targetWords[Number(btn.dataset.recWordIdx)];
        this.audio.playFile(this.selectedRecWord.wav);
        if (this.audio.userBuffer) {
          this.lastComparison = await this.audio.compareWithModel(
            this.selectedRecWord.wav,
            this.selectedRecWord,
            unit
          );
        }
        this.renderRecordMode(panel, unit);
      });
    });

    document.getElementById('btn-have-a-go')?.addEventListener('click', () => {
      this.audio.playFile(SYSTEM_AUDIO.haveAGo);
    });

    document.getElementById('btn-rec-play-native')?.addEventListener('click', () => {
      this.audio.playFile(this.selectedRecWord.wav);
    });

    document.getElementById('btn-rec-toggle')?.addEventListener('click', async () => {
      const statusEl = document.getElementById('rec-status');
      if (!this.audio.isRecording) {
        try {
          this.lastComparison = null;
          await this.audio.startRecording();
          this.renderRecordMode(panel, unit);
          const s = document.getElementById('rec-status');
          if (s) s.textContent = 'Recording live… speak into your microphone, then click Stop.';
        } catch (err) {
          if (statusEl) statusEl.textContent = `Microphone unavailable: ${err.message}`;
        }
      } else {
        await this.audio.stopRecording();
        this.lastComparison = await this.audio.compareWithModel(
          this.selectedRecWord.wav,
          this.selectedRecWord,
          unit
        );
        this.renderRecordMode(panel, unit);
      }
    });

    document.getElementById('btn-rec-play-user')?.addEventListener('click', () => {
      this.audio.playUserRecording();
    });

    document.getElementById('btn-rec-compare')?.addEventListener('click', () => {
      const nativeWav = this.selectedRecWord.wav;
      this.audio.playSequence(
        [{ file: nativeWav }, { isUser: true }, { file: nativeWav }],
        280
      );
    });
  }

  renderComparisonCard() {
    const c = this.lastComparison;
    if (!c) return '';

    if (c.tooQuiet) {
      return `
        <div class="similarity-card is-low">
          <div class="similarity-header">
            <h4>Acoustic Comparison</h4>
            <span class="similarity-score">—</span>
          </div>
          <ul class="similarity-tips">
            ${c.tips.map((t) => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    const tierClass = c.overallPct >= 78 ? 'is-high' : c.overallPct >= 55 ? 'is-mid' : 'is-low';
    const hasSib = c.modelSibilantHz > 0 && c.userSibilantHz > 0;

    return `
      <div class="similarity-card ${tierClass}">
        <div class="similarity-header">
          <div>
            <h4>Acoustic Similarity to Model</h4>
            <span style="font-size:0.78rem; color:var(--text-secondary);">
              Bark-band spectral trajectory + centroid + active duration
            </span>
          </div>
          <span class="similarity-score">${c.overallPct}%</span>
        </div>

        <div class="similarity-bar-track" aria-hidden="true">
          <div class="similarity-bar-fill" style="width:${c.overallPct}%"></div>
        </div>

        <div class="similarity-metrics">
          <div class="metric-pill">
            <span>Spectral Match</span>
            <strong>${c.spectralPct}%</strong>
          </div>
          <div class="metric-pill">
            <span>Duration (${c.userMs} vs ${c.modelMs} ms)</span>
            <strong>${c.durationPct}%</strong>
          </div>
          <div class="metric-pill">
            <span>${hasSib ? `Fricative Peak (${c.userSibilantHz} vs ${c.modelSibilantHz} Hz)` : `Centroid (${c.userCentroidHz} vs ${c.modelCentroidHz} Hz)`}</span>
            <strong>${c.centroidPct}%</strong>
          </div>
        </div>

        <div class="similarity-tips-wrap">
          <h5>Coaching Feedback</h5>
          <ul class="similarity-tips">
            ${c.tips.map((t) => `<li>${t}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SoundsEnglishApp();
});


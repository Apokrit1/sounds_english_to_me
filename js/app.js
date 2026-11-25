import {
  UNITS,
  UNIT_MAP,
  CATEGORIES,
  SYSTEM_AUDIO,
  CREDITS_1994,
} from '../data/curriculum.js';
import { GLOSSARY } from '../data/glossary.js';
import { AudioEngine } from './audio-engine.js';
import { GeminiTtsPlayer, GEMINI_VOICES } from './gemini-tts.js';

const STORAGE_KEY = 'sounds-english-to-me:stats:v1';

class SoundsEnglishApp {
  constructor() {
    this.audio = new AudioEngine();
    this.tts = new GeminiTtsPlayer(this.audio);
    this.glossaryEntries = this.buildGlossaryEntries();
    this.state = {
      view: 'contents', // 'contents' | 'unit' | 'glossary'
      unitId: 'unit1',
      mode: 'explore', // 'explore' | 'identify' | 'ax' | 'record'
      groupIndex: 0,
      glossaryQuery: '',
      glossaryLetter: 'ALL',
      glossaryLevel: 'ALL',
      theme: localStorage.getItem('setm-theme') || 'dark',
      stats: this.loadStats(),
    };

    // Active quiz / drill states
    this.idQuiz = null;
    this.axQuiz = null;
    this.recordTarget = null;
    this.lastComparison = null;
    this.deferredInstallPrompt = null;
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
    this.header = document.getElementById('app-header');
    this.appMain = document.getElementById('app-main');
    this.liveRegion = document.getElementById('live-announcer');
    this.coachToast = document.getElementById('coach-toast');
    this.coachText = document.getElementById('coach-toast-text');
    this.themeBtn = document.getElementById('btn-theme');
    this.glossaryNavBtn = document.getElementById('btn-open-glossary');

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
      this.themeBtn.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', theme === 'dark' ? '#0a0f18' : '#f8fafc');
    }
  }

  bindGlobalEvents() {
    const syncHeaderScroll = () => {
      if (this.header) {
        this.header.classList.toggle('is-scrolled', window.scrollY > 8);
      }
    };
    window.addEventListener('scroll', syncHeaderScroll, { passive: true });
    syncHeaderScroll();

    document.getElementById('btn-home')?.addEventListener('click', () => {
      this.navigate(() => {
        this.state.view = 'contents';
      });
    });

    this.themeBtn?.addEventListener('click', () => {
      this.applyTheme(this.state.theme === 'dark' ? 'light' : 'dark');
    });

    document.getElementById('btn-open-glossary')?.addEventListener('click', () => {
      this.navigate(() => {
        this.state.view = 'glossary';
      });
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

    const installBtn = document.getElementById('btn-install-pwa');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (installBtn) installBtn.hidden = false;
    });

    installBtn?.addEventListener('click', async () => {
      if (!this.deferredInstallPrompt) return;
      this.deferredInstallPrompt.prompt();
      await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      installBtn.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      if (installBtn) installBtn.hidden = true;
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
          'Tip: Play sip and ship above to hear the /s/ vs. /ʃ/ contrast, or open Unit 1 for live spectral feedback.';
      } else {
        this.coachText.textContent =
          'Tip: Click any word to hear it, click + to hear the minimal pair back-to-back, or switch to Identification test.';
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
        <p class="prose-block"><strong>${CREDITS_1994.title}</strong>: <em>${CREDITS_1994.subtitle}</em></p>
        <p class="prose-block">Originally authored in <strong>ToolBook 3.0 (${CREDITS_1994.year})</strong> by <strong>${CREDITS_1994.author}</strong> for the <strong>${CREDITS_1994.degree}</strong>.</p>
        <blockquote class="credits-quote">${CREDITS_1994.creditsText}</blockquote>
        <p class="credits-note">${CREDITS_1994.copyrightNote}</p>
      `;
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
            <td><strong>${u.badge}</strong> <span class="text-secondary">${u.title}</span></td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td class="text-muted">Not practiced yet</td>
          </tr>
        `;
      }
      const idAcc = s.identifyAttempts
        ? `${Math.round((s.identifyCorrect / s.identifyAttempts) * 100)}% (${s.identifyCorrect}/${s.identifyAttempts})`
        : '-';
      const axAcc = s.axAttempts
        ? `${Math.round((s.axCorrect / s.axAttempts) * 100)}% (${s.axCorrect}/${s.axAttempts})`
        : '-';
      const avgRt = s.rtCount ? `${Math.round(s.totalRtMs / s.rtCount)} ms` : '-';
      const topConf = Object.entries(s.confusions || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k, v]) => `${k} (×${v})`)
        .join(', ');

      return `
        <tr>
          <td><strong>${u.badge}</strong> <span class="text-secondary">${u.title}</span></td>
          <td>${idAcc}</td>
          <td>${axAcc}</td>
          <td>${avgRt}</td>
          <td>${topConf || 'None'}</td>
        </tr>
      `;
    }).join('');

    body.innerHTML = `
      <div class="stats-summary">
        <div class="stats-summary-item">
          <span>Total trials</span>
          <strong>${totalTrials}</strong>
        </div>
        <div class="stats-summary-item is-success">
          <span>Overall accuracy</span>
          <strong>${totalTrials ? overallAcc + '%' : '-'}</strong>
        </div>
      </div>
      <div class="stats-table-wrap">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Identification</th>
              <th>AX discrimination</th>
              <th>Mean RT</th>
              <th>Top L1 confusions</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  render() {
    if (this.glossaryNavBtn) {
      if (this.state.view === 'glossary') {
        this.glossaryNavBtn.setAttribute('aria-current', 'page');
      } else {
        this.glossaryNavBtn.removeAttribute('aria-current');
      }
    }

    if (this.state.view === 'contents') {
      this.renderContentsView();
    } else if (this.state.view === 'glossary') {
      this.renderGlossaryView();
    } else {
      this.renderUnitView();
    }
  }

  buildGlossaryEntries() {
    const map = new Map();
    for (const u of UNITS) {
      for (const g of u.groups) {
        for (const item of g.items) {
          for (const w of item.words) {
            const key = w.text.toLowerCase();
            if (!map.has(key)) {
              const gEntry = GLOSSARY[key] || {
                pos: 'word',
                level: 'A2',
                definition: `Target pronunciation word (${w.ipa}).`,
                example: `Listen carefully to the word "${w.text}".`,
              };
              map.set(key, {
                word: w.text,
                ipa: w.ipa,
                wav: w.wav,
                pos: gEntry.pos,
                level: gEntry.level,
                definition: gEntry.definition,
                example: gEntry.example,
                units: [],
              });
            }
            const rec = map.get(key);
            if (!rec.units.some((x) => x.id === u.id)) {
              rec.units.push({ id: u.id, badge: u.badge });
            }
          }
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      a.word.toLowerCase().localeCompare(b.word.toLowerCase())
    );
  }

  renderGlossaryView() {
    const query = this.state.glossaryQuery.trim().toLowerCase();
    const letter = this.state.glossaryLetter;
    const levelFilter = this.state.glossaryLevel;

    const letters = [...new Set(this.glossaryEntries.map((e) => e.word[0].toUpperCase()))].sort();

    const filtered = this.glossaryEntries.filter((e) => {
      if (letter !== 'ALL' && e.word[0].toUpperCase() !== letter) return false;
      if (levelFilter === 'B1_C1' && !['B1', 'B2', 'C1'].includes(e.level)) return false;
      if (levelFilter === 'A1_A2' && !['A1', 'A2'].includes(e.level)) return false;
      if (query) {
        const hay = `${e.word} ${e.definition} ${e.example} ${e.units.map((u) => u.badge).join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    const hasApiKey = Boolean(this.tts.getApiKey());
    const activeVoice = this.tts.getVoice();

    const alphaButtonsHtml = ['ALL', ...letters]
      .map(
        (ch) => `
        <button class="alpha-btn" data-alpha="${ch}" aria-pressed="${letter === ch}">
          ${ch === 'ALL' ? 'All' : ch}
        </button>`
      )
      .join('');

    const voiceOptionsHtml = GEMINI_VOICES.map(
      (v) => `<option value="${v.id}" ${v.id === activeVoice ? 'selected' : ''}>${v.label}</option>`
    ).join('');

    const entriesHtml = filtered
      .map((e, idx) => {
        const isAdv = ['B1', 'B2', 'C1'].includes(e.level);
        const unitLinks = e.units
          .map(
            (u) =>
              `<button class="token-trigger" data-jump-unit="${u.id}" title="Open ${u.badge}">${u.badge}</button>`
          )
          .join('');
        return `
          <article class="glossary-entry">
            <div class="glossary-entry-top">
              <div class="glossary-word-title">
                <h3>${e.word}</h3>
                <span class="glossary-ipa">${e.ipa}</span>
              </div>
              <span class="glossary-meta ${isAdv ? 'is-advanced' : ''}">${e.pos} · ${e.level}</span>
            </div>
            <p class="glossary-def">${e.definition}</p>
            <p class="glossary-example">“${e.example}”</p>
            <div class="glossary-entry-footer">
              <div class="glossary-audio-actions">
                <button class="action-link" data-gloss-wav="${e.wav}" title="Play 1994 studio recording">▶ Word</button>
                <button class="action-link is-accent" data-gloss-tts="${idx}" title="Read definition and example aloud">
                  🔊 Read aloud
                </button>
              </div>
              <div class="glossary-unit-links">${unitLinks}</div>
            </div>
          </article>
        `;
      })
      .join('');

    this.appMain.innerHTML = `
      <div class="studio-topbar">
        <button class="nav-link" id="btn-gloss-back">← Contents</button>
        <span class="text-secondary" style="font-size: var(--text-sm);">
          Showing <strong>${filtered.length}</strong> of <strong>${this.glossaryEntries.length}</strong> words
        </span>
      </div>

      <section class="glossary-header">
        <div>
          <h1 class="studio-title">Alphabetical glossary (A–Z)</h1>
          <p class="glossary-lead">
            Every word from all 14 units with a plain English definition, example sentence, CEFR level,
            original 1994 studio audio, and Gemini TTS voice reading.
          </p>
        </div>

        <div class="glossary-controls-row">
          <input
            type="search"
            id="glossary-search-input"
            class="glossary-search"
            placeholder="Search word, meaning, or unit (e.g. etch, wits, Unit 1)..."
            value="${this.state.glossaryQuery.replace(/"/g, '&quot;')}"
          />
          <select id="glossary-level-select" class="studio-select" aria-label="Filter by CEFR level">
            <option value="ALL" ${levelFilter === 'ALL' ? 'selected' : ''}>All levels (A1–C1)</option>
            <option value="B1_C1" ${levelFilter === 'B1_C1' ? 'selected' : ''}>B1–C1 vocabulary only</option>
            <option value="A1_A2" ${levelFilter === 'A1_A2' ? 'selected' : ''}>A1–A2 core words</option>
          </select>
        </div>

        <details class="tts-settings-details" ${!hasApiKey ? 'open' : ''}>
          <summary>
            Gemini TTS voice settings · Status:
            <span id="tts-status-label" style="color:${hasApiKey ? 'var(--accent-success)' : 'var(--accent-warn)'};">
              ${hasApiKey ? `Gemini TTS ready (${activeVoice})` : 'Browser fallback (add Gemini API key for Gemini TTS)'}
            </span>
          </summary>
          <div class="tts-settings-body">
            <input
              type="password"
              id="gemini-key-input"
              class="glossary-search"
              style="max-width:360px;"
              placeholder="Paste Gemini API key (saved locally)..."
              value="${this.tts.getApiKey()}"
            />
            <select id="gemini-voice-select" class="studio-select" aria-label="Gemini TTS voice">
              ${voiceOptionsHtml}
            </select>
            <button class="btn btn-primary" id="btn-save-gemini">Save settings</button>
            <button class="btn" id="btn-clear-gemini">Clear key</button>
          </div>
          <p class="tts-note">
            Uses <code>gemini-2.5-flash-preview-tts</code> (or pre-generated <code>audio/glossary/*.wav</code> if present).
            Your API key stays only in your browser's <code>localStorage</code> and is sent directly to Google's Gemini API.
          </p>
        </details>
      </section>

      <div class="alpha-bar" role="group" aria-label="Filter by starting letter">
        ${alphaButtonsHtml}
      </div>

      <div class="glossary-grid">
        ${entriesHtml || '<p class="text-secondary">No matching words found.</p>'}
      </div>
    `;

    document.getElementById('btn-gloss-back')?.addEventListener('click', () => {
      this.tts.stop();
      this.navigate(() => {
        this.state.view = 'contents';
      });
    });

    document.getElementById('glossary-search-input')?.addEventListener('input', (e) => {
      this.state.glossaryQuery = e.target.value;
      this.renderGlossaryView();
      const el = document.getElementById('glossary-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    document.getElementById('glossary-level-select')?.addEventListener('change', (e) => {
      this.state.glossaryLevel = e.target.value;
      this.renderGlossaryView();
    });

    this.appMain.querySelectorAll('[data-alpha]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.glossaryLetter = btn.dataset.alpha;
        this.renderGlossaryView();
      });
    });

    document.getElementById('btn-save-gemini')?.addEventListener('click', () => {
      const key = document.getElementById('gemini-key-input')?.value || '';
      const voice = document.getElementById('gemini-voice-select')?.value || 'Kore';
      this.tts.setApiKey(key);
      this.tts.setVoice(voice);
      this.renderGlossaryView();
    });

    document.getElementById('btn-clear-gemini')?.addEventListener('click', () => {
      this.tts.setApiKey('');
      this.renderGlossaryView();
    });

    this.appMain.querySelectorAll('[data-gloss-wav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tts.stop();
        btn.classList.add('is-playing');
        this.audio.playFile(btn.dataset.glossWav).finally(() => {
          btn.classList.remove('is-playing');
        });
      });
    });

    this.appMain.querySelectorAll('[data-gloss-tts]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const entry = filtered[Number(btn.dataset.glossTts)];
        if (!entry) return;
        const origLabel = btn.textContent;
        btn.classList.add('is-playing');
        btn.textContent = 'Speaking...';
        try {
          const result = await this.tts.speakEntry(entry);
          const statusEl = document.getElementById('tts-status-label');
          if (statusEl && result.error) {
            statusEl.textContent = `Fallback used (${result.error})`;
            statusEl.style.color = 'var(--accent-warn)';
          }
        } finally {
          btn.classList.remove('is-playing');
          btn.textContent = origLabel;
        }
      });
    });

    this.appMain.querySelectorAll('[data-jump-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tts.stop();
        this.openUnit(btn.dataset.jumpUnit);
      });
    });
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
    const sectionsHtml = CATEGORIES.map((cat) => {
      const catUnits = UNITS.filter((u) => u.category === cat.id);
      const cellsHtml = catUnits
        .map((u) => {
          const acc = this.getUnitAccuracyText(u.id);
          return `
            <article class="unit-cell" data-unit-id="${u.id}">
              <div class="unit-cell-meta">
                <span class="unit-label ${u.restored ? 'is-restored' : ''}">
                  ${u.badge}${u.restored ? ' · Restored' : ''}
                </span>
                ${acc ? `<span class="unit-accuracy" title="Your accuracy">${acc}</span>` : ''}
              </div>
              <h3 class="unit-ipa">${u.title}</h3>
              <p class="unit-exemplar">${u.subtitle}</p>
              <p class="unit-pam">${u.pamType}</p>
              <div class="unit-cell-actions">
                <button class="action-link is-accent" data-open-unit="${u.id}">Open studio →</button>
                <button
                  class="action-link"
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
          <div class="unit-grid">${cellsHtml}</div>
        </section>
      `;
    }).join('');

    this.appMain.innerHTML = `
      <section class="studio-opening" aria-labelledby="opening-title">
        <div class="opening-lead">
          <h1 id="opening-title" class="opening-title">Train English contrasts that Greek merges</h1>
          <p class="opening-copy">
            Fourteen minimal-pair units from the 1994 UCL Speech &amp; Hearing Sciences corpus, with cross-token drills and live spectral feedback.
          </p>
        </div>

        <div class="opening-workbench" aria-label="Interactive /s/ vs. /ʃ/ contrast preview">
          <div class="opening-preview-meta">
            <span class="opening-preview-label">Preview /s/ vs. /ʃ/ from Unit 1</span>
            <span class="opening-preview-cue">Alveolar 6–8.5 kHz vs. postalveolar 2.5–3.8 kHz</span>
          </div>

          <div class="opening-preview-row">
            <div class="opening-pair-group" role="group" aria-label="Play sip and ship contrast">
              <button class="preview-word-btn" id="btn-preview-sip" data-preview-wav="SIP.WAV">
                <span class="preview-word-text">sip</span>
                <span class="preview-word-ipa">/sɪp/</span>
              </button>
              <button
                class="plus-contrast-btn"
                id="btn-preview-plus"
                aria-label="Play sip then ship contrast"
                title="Hear sip → ship contrast"
              >+</button>
              <button class="preview-word-btn" id="btn-preview-ship" data-preview-wav="SHIP.WAV">
                <span class="preview-word-text">ship</span>
                <span class="preview-word-ipa">/ʃɪp/</span>
              </button>
            </div>

            <button class="btn btn-primary" id="btn-hero-start-u1">Open Unit 1</button>
          </div>
        </div>
      </section>
      ${sectionsHtml}
    `;

    // Preload opening contrast preview tokens
    this.audio.preload(['SIP.WAV', 'SHIP.WAV']);

    const sipBtn = document.getElementById('btn-preview-sip');
    const shipBtn = document.getElementById('btn-preview-ship');
    const plusBtn = document.getElementById('btn-preview-plus');
    const previewBtns = [sipBtn, shipBtn].filter(Boolean);

    previewBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        previewBtns.forEach((el) => el.classList.remove('is-playing'));
        plusBtn?.classList.remove('is-playing');
        btn.classList.add('is-playing');
        this.audio.playFile(btn.dataset.previewWav).finally(() => {
          btn.classList.remove('is-playing');
        });
      });
    });

    plusBtn?.addEventListener('click', () => {
      previewBtns.forEach((el) => el.classList.remove('is-playing'));
      plusBtn.classList.add('is-playing');
      this.audio
        .playSequence(['SIP.WAV', 'SHIP.WAV'], 230, {
          onStepStart: (i) => {
            previewBtns.forEach((el, idx) => el.classList.toggle('is-playing', idx === i));
          },
          onStepEnd: () => {
            previewBtns.forEach((el) => el.classList.remove('is-playing'));
          },
        })
        .finally(() => {
          plusBtn.classList.remove('is-playing');
          previewBtns.forEach((el) => el.classList.remove('is-playing'));
        });
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
    const wavs = [...unit.unitAudio, ...(unit.altUnitAudio || [])];
    for (const g of unit.groups) {
      if (g.contrastAudio) wavs.push(g.contrastAudio);
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
            class="phoneme-trigger"
            data-phoneme-audio="${p.audio}"
            popovertarget="cue-popover-${idx}"
            title="Play ${p.ipa} reference and view articulation"
          >
            <span class="chip-ipa">${p.ipa}</span>
            <span>${p.label}</span>
            <span class="chip-hz">${p.frequencyHint}</span>
          </button>
          <div id="cue-popover-${idx}" popover="auto" class="cue-popover">
            <h4>${p.ipa}: ${p.label}</h4>
            <p>${p.articulation}</p>
            <p class="popover-cue">Acoustic cue: <strong>${p.frequencyHint}</strong></p>
          </div>
        `
      )
      .join('');

    this.appMain.innerHTML = `
      <div class="studio-topbar">
        <div class="studio-nav-group">
          <button class="nav-link" id="btn-back-contents">← Contents</button>
          <button class="nav-link" id="btn-prev-unit" ${!prevUnit ? 'disabled' : ''}>
            ‹ ${prevUnit ? prevUnit.badge : 'Start'}
          </button>
          <button class="nav-link" id="btn-next-unit" ${!nextUnit ? 'disabled' : ''}>
            ${nextUnit ? nextUnit.badge : 'End'} ›
          </button>
        </div>
        <button class="action-link is-accent" id="btn-play-unit-banner">▶ Unit audio (${unit.badge})</button>
      </div>

      <section class="studio-header">
        <h1 class="studio-title">
          ${unit.badge}: <span class="ipa-title">${unit.title}</span>
        </h1>
        <p class="studio-subtitle-row">
          <span>${unit.subtitle}</span>
          <span>${unit.pamType}</span>
          ${unit.restored ? '<span class="studio-restored-note">Restored from 1994 archive</span>' : ''}
        </p>

        <div class="phoneme-strip">${phonemesHtml}</div>

        <div class="interference-grid">
          <div class="interference-col is-trap">
            <h4>Greek L1 interference</h4>
            <p>${unit.l1Interference.summary}</p>
          </div>
          <div class="interference-col">
            <h4>Acoustic contrast target</h4>
            <p>${unit.l1Interference.englishTarget}</p>
          </div>
          <div class="interference-col is-tip">
            <h4>Articulatory and listening cue</h4>
            <p>${unit.l1Interference.coachingTip}</p>
          </div>
        </div>
      </section>

      <div class="mode-tabs" role="tablist" aria-label="Practice modes">
        <button class="mode-tab" role="tab" data-mode="explore" aria-selected="${this.state.mode === 'explore'}">
          Explore &amp; contrast
        </button>
        <button class="mode-tab" role="tab" data-mode="identify" aria-selected="${this.state.mode === 'identify'}">
          Identification test
        </button>
        <button class="mode-tab" role="tab" data-mode="ax" aria-selected="${this.state.mode === 'ax'}">
          AX same / different
        </button>
        <button class="mode-tab" role="tab" data-mode="record" aria-selected="${this.state.mode === 'record'}">
          Record &amp; compare
        </button>
      </div>

      <div class="studio-workspace">
        <section class="studio-main-col" id="mode-panel"></section>
        <aside class="biofeedback-panel" aria-label="Real-time acoustic visualizer">
          <div class="biofeedback-header">
            <h3>Acoustic spectrum and waveform</h3>
            <span class="centroid-readout" id="centroid-readout">Centroid: - Hz</span>
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
      const seq = [...unit.unitAudio, ...(unit.altUnitAudio || [])];
      this.audio.playSequence(seq, 180);
    });

    // Phoneme triggers play sound as well as opening popover
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
      return 'Focused 0–4 kHz vowel formant window showing F1 (jaw openness) and F2 (tongue frontness) energy distribution.';
    }
    if (mode === 'vot') {
      return 'Watch the upper white waveform for silent stop-closure gaps and release bursts (VOT / aspiration).';
    }
    return 'Compare nasal resonance energy vs. final /k/ release burst in the waveform and spectrum.';
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

    const subgroupControl =
      groups.length > 1
        ? `<div class="segmented-control" role="group" aria-label="Contrast subgroup">
            ${groups
              .map(
                (g, i) => `
                <button class="segmented-btn" data-group-idx="${i}" aria-pressed="${i === this.state.groupIndex}">
                  ${g.label}
                </button>`
              )
              .join('')}
          </div>`
        : `<span class="subgroup-heading">${activeGroup.label}</span>`;

    const rowsHtml = activeGroup.items
      .map((item, rowIdx) => {
        const isTriplet = item.words.length > 2;
        const wordSlotsHtml = item.words
          .map((w, wIdx) => {
            const altButtons = (w.altWavs || [])
              .map(
                (altWav, aIdx) => `
                  <button class="token-trigger" data-wav="${altWav}" title="Alternate acoustic token (${altWav})">
                    Token ${String.fromCharCode(66 + aIdx)}
                  </button>`
              )
              .join('');

            return `
              <div class="word-slot">
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
          ? `${wordSlotsHtml}${plusBtnHtml}`
          : wordSlotsHtml.replace('<!--plus-slot-->', plusBtnHtml);

        return `<div class="pair-row ${isTriplet ? 'is-triplet' : ''}">${inner}</div>`;
      })
      .join('');

    panel.innerHTML = `
      <div class="subgroup-bar">
        ${subgroupControl}
        <div class="subgroup-actions">
          ${activeGroup.contrastAudio ? '<button class="action-link" id="btn-contrast-audio">▶ Hear contrast</button>' : ''}
          <button class="action-link is-accent" id="btn-pair-drill">▶ Auto pair drill</button>
        </div>
      </div>
      <div class="pairs-list">${rowsHtml}</div>
    `;

    panel.querySelectorAll('[data-group-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.groupIndex = Number(btn.dataset.groupIdx);
        const selectedGroup = groups[this.state.groupIndex];
        if (selectedGroup?.contrastAudio) {
          this.audio.playFile(selectedGroup.contrastAudio);
        }
        this.renderExploreMode(panel, unit);
      });
    });

    document.getElementById('btn-contrast-audio')?.addEventListener('click', () => {
      if (activeGroup.contrastAudio) {
        this.audio.playFile(activeGroup.contrastAudio);
      }
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
            <span class="opt-key">Key ${idx + 1}</span>
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
            <strong>${isRight ? 'Correct.' : `You clicked "${q.options[q.selectedIdx].text}". Target was "${q.targetWord.text}".`}</strong>
            <div class="feedback-sub">
              ${isRight ? 'Accurate categorical discrimination.' : 'Listen to the pair side-by-side now to recalibrate the contrast.'}
            </div>
          </div>
          <div class="feedback-actions">
            <button class="btn" id="btn-id-contrast">▶ Hear contrast (${q.options.map((w) => w.text).join(' ↔ ')})</button>
            <button class="btn btn-primary" id="btn-id-next">Next question →</button>
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
          <span>Score: <strong>${q.score} / ${q.total}</strong> (${q.total ? acc + '%' : '-'})</span>
          <span>Streak: <strong>${q.streak}</strong></span>
          <span>Source: <strong>${q.tokenLabel}${q.isAltToken ? ' (cross-token HVPT)' : ''}</strong></span>
        </div>

        <div class="quiz-prompt-block">
          <h3>Click the word you heard</h3>
          <p>Press <kbd>R</kbd> to replay, or <kbd>1</kbd>–<kbd>${q.options.length}</kbd> to answer.</p>
          <button class="btn btn-primary" id="btn-id-replay">▶ Replay target word</button>
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
            <strong>${isRight ? 'Correct.' : 'Incorrect.'} Word 1 was "${q.wordA.text}" (${q.wordA.ipa}) · Word 2 was "${q.wordB.text}" (${q.wordB.ipa}).</strong>
            <div class="feedback-sub">${q.tokenNote}</div>
          </div>
          <div class="feedback-actions">
            <button class="btn" id="btn-ax-replay-2">▶ Replay pair</button>
            <button class="btn btn-primary" id="btn-ax-next">Next pair →</button>
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
          <span>AX score: <strong>${q.score} / ${q.total}</strong> (${q.total ? acc + '%' : '-'})</span>
          <span>Target contrast: <strong>${unit.title}</strong></span>
        </div>

        <div class="quiz-prompt-block">
          <h3>Are these two recordings the same word or different words?</h3>
          <p>Trains phonemic categorization across acoustic tokens rather than raw waveform matching.</p>
          <button class="btn btn-primary" id="btn-ax-replay">▶ Play both words</button>
        </div>

        <div class="quiz-options-grid">
          <button
            class="quiz-option-btn"
            id="btn-ax-same"
            ${q.answered && q.isSame ? 'data-state="correct"' : q.answered && q.userSaidSame === true && !q.isSame ? 'data-state="wrong"' : ''}
            ${q.answered ? 'disabled' : ''}
          >
            <span class="opt-word">Same word</span>
            <span class="opt-key">Key 1 / S</span>
          </button>
          <button
            class="quiz-option-btn"
            id="btn-ax-diff"
            ${q.answered && !q.isSame ? 'data-state="correct"' : q.answered && q.userSaidSame === false && q.isSame ? 'data-state="wrong"' : ''}
            ${q.answered ? 'disabled' : ''}
          >
            <span class="opt-word">Different words</span>
            <span class="opt-key">Key 2 / D</span>
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

    const wordSegmentsHtml = targetWords
      .map(
        (w, i) => `
        <button
          class="segmented-btn"
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
          <label class="subgroup-heading">
            Practice contrast:
            <select id="rec-pair-select" class="studio-select" style="margin-left:0.45rem;">
              ${pairOptionsHtml}
            </select>
          </label>
          <button class="action-link" id="btn-have-a-go">▶ "Have a go!" prompt</button>
        </div>

        <div class="segmented-control" role="group" aria-label="Target word">${wordSegmentsHtml}</div>

        <div class="quiz-prompt-block">
          <h3>Active target: <span style="color:var(--accent-primary)">${this.selectedRecWord.text}</span> <span class="text-secondary">${this.selectedRecWord.ipa}</span></h3>
          <p>Listen to Frederica's 1994 model, record your pronunciation, then compare side-by-side on the spectrum meter.</p>

          <div class="record-controls">
            <button class="btn" id="btn-rec-play-native">▶ Play native model</button>
            <button class="btn ${this.audio.isRecording ? 'btn-record-active' : 'btn-primary'}" id="btn-rec-toggle">
              ${this.audio.isRecording ? '■ Stop recording' : '● Record your voice'}
            </button>
            <button class="btn" id="btn-rec-play-user" ${!this.audio.userBuffer ? 'disabled' : ''}>
              ▶ Play yours
            </button>
            <button class="btn" id="btn-rec-compare" ${!this.audio.userBuffer ? 'disabled' : ''}>
              ⇄ Compare (Native → You → Native)
            </button>
          </div>
          <p id="rec-status" class="record-status">
            ${this.audio.userBuffer ? 'Recording captured. Click "Compare" to hear Native → You → Native.' : 'No microphone recording captured yet.'}
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
          if (s) s.textContent = 'Recording live... speak into your microphone, then click Stop.';
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
        <div class="similarity-report is-low">
          <div class="similarity-header">
            <h4>Acoustic comparison</h4>
            <span class="similarity-score">-</span>
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
      <div class="similarity-report ${tierClass}">
        <div class="similarity-header">
          <div>
            <h4>Acoustic similarity to model</h4>
            <span class="similarity-sub">
              Bark-band spectral trajectory, centroid, and active duration
            </span>
          </div>
          <span class="similarity-score">${c.overallPct}%</span>
        </div>

        <div class="similarity-bar-track" aria-hidden="true">
          <div class="similarity-bar-fill" style="width:${c.overallPct}%"></div>
        </div>

        <div class="similarity-metrics">
          <div class="metric-item">
            <span>Spectral match</span>
            <strong>${c.spectralPct}%</strong>
          </div>
          <div class="metric-item">
            <span>Duration (${c.userMs} vs ${c.modelMs} ms)</span>
            <strong>${c.durationPct}%</strong>
          </div>
          <div class="metric-item">
            <span>${hasSib ? `Fricative peak (${c.userSibilantHz} vs ${c.modelSibilantHz} Hz)` : `Centroid (${c.userCentroidHz} vs ${c.modelCentroidHz} Hz)`}</span>
            <strong>${c.centroidPct}%</strong>
          </div>
        </div>

        <div class="similarity-tips-wrap">
          <h5>Coaching feedback</h5>
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


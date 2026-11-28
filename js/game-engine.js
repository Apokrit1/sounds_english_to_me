import { AudioEngine } from './audio-engine.js';
import { UNIT_MAP } from '../data/curriculum.js';

const audio = new AudioEngine();
const storagePrefix = 'setm_junior_progress:';
const get = (id) => document.getElementById(id);
const map = get('map');
const mission = get('mission');
const results = get('results');
const listen = get('listen');
const feedback = get('feedback');
const next = get('next');
const student = get('student');
const back = get('back');
const answers = [...document.querySelectorAll('.answer')];

let worlds = [];
let session;

for (let index = 1; index <= 30; index += 1) {
  const code = String(index).padStart(2, '0');
  student.add(new Option('Μαθητής ' + code, 'S' + code));
}

function shuffle(items) {
  const order = [...items];
  for (let end = order.length - 1; end > 0; end -= 1) {
    const pick = Math.floor(Math.random() * (end + 1));
    [order[end], order[pick]] = [order[pick], order[end]];
  }
  return order;
}

function buildDeck(world) {
  const pairs = shuffle(world.pairs).map((pair) => ({
    pair,
    firstTarget: Math.floor(Math.random() * 2),
    voices: shuffle(pair.recordings),
  }));
  return [0, 1].flatMap((pass) => pairs.map(({ pair, firstTarget, voices }) => {
    const recording = voices[pass % voices.length];
    return {
      pair: pair.id,
      speaker: recording.speaker,
      options: shuffle(pair.words.map((word, index) => ({
        ...word,
        file: recording.files[index],
        target: index === (firstTarget + pass) % 2,
      }))),
    };
  }));
}

function currentTrial() {
  return session?.deck[session.responses.length];
}

function recommendedWorld() {
  // Studio statistics are shared by the browser, so only use them in guest mode.
  if (student.value) return null;
  try {
    const stats = JSON.parse(localStorage.getItem('sounds-english-to-me:stats:v1'));
    let bestCount = 0;
    let bestId = null;
    for (const world of worlds) {
      const confusions = stats?.units?.[world.studioUnit]?.confusions;
      if (!confusions) continue;
      const unit = UNIT_MAP.get(world.studioUnit);
      const words = new Map(unit.groups.flatMap((group) =>
        group.items.flatMap((item) => item.words.map((word) => [word.text, word.ipa]))
      ));
      const count = Object.entries(confusions).reduce((total, [pair, misses]) => {
        const sounds = pair.split(/ vs | \/ /).map((word) => words.get(word) || '');
        const [a, b] = world.phonemes;
        const [first, second] = sounds;
        const match = sounds.length === 2 &&
          ((first.includes(a) && second.includes(b)) || (first.includes(b) && second.includes(a)));
        return total + (match && Number.isFinite(misses) ? misses : 0);
      }, 0);
      if (count > bestCount) {
        bestCount = count;
        bestId = world.id;
      }
    }
    return bestId;
  } catch {
    return null;
  }
}

function renderWorlds() {
  const recommended = recommendedWorld();
  const buttons = worlds.map((world) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'world';
    const fields = [
      ['world-icon', world.icon, true],
      ['world-arrow', '→', true],
      ['world-title', world.title],
      ['world-detail', world.contrast + ' · ' + world.pairs.length * 2 + ' παραδόσεις'],
    ];
    if (world.id === recommended) fields.push(['recommendation', '★ Προτεινόμενη αποστολή']);
    for (const [className, text, decorative] of fields) {
      const span = document.createElement(className === 'world-title' ? 'strong' : 'span');
      span.className = className;
      span.textContent = text;
      if (decorative) span.setAttribute('aria-hidden', 'true');
      button.append(span);
    }
    button.addEventListener('click', () => start(world));
    return button;
  });
  get('worlds').replaceChildren(...buttons);
}

function showScreen(screen) {
  for (const section of [map, mission, results]) section.hidden = section !== screen;
  back.hidden = screen === map;
  screen.querySelector('h1').focus();
}

function start(world) {
  session = { world, student: student.value, deck: buildDeck(world), responses: [], phase: 'ready' };
  get('mission-title').textContent = world.title;
  get('progress').max = session.deck.length;
  renderTrial();
  showScreen(mission);
}

function renderTrial() {
  session.phase = 'ready';
  get('round-count').textContent = 'Παράδοση ' + (session.responses.length + 1) + ' / ' + session.deck.length;
  get('progress').value = session.responses.length;
  for (const [index, button] of answers.entries()) {
    const option = currentTrial().options[index];
    button.className = 'answer';
    button.querySelector('.answer-icon').textContent = option.icon;
    button.querySelector('.answer-word').textContent = option.text;
    button.disabled = true;
  }
  listen.hidden = false;
  listen.removeAttribute('aria-disabled');
  listen.textContent = '▶ Άκου τη λέξη';
  feedback.textContent = 'Πάτησε τον ασύρματο.';
  next.hidden = true;
}

async function playClue() {
  if (!session || !['ready', 'heard'].includes(session.phase)) return;
  const active = session;
  const trial = currentTrial();
  const target = trial.options.find((option) => option.target);
  active.phase = 'playing';
  listen.setAttribute('aria-disabled', 'true');
  answers.forEach((button) => { button.disabled = true; });
  feedback.textContent = 'Παίζει η λέξη…';
  try {
    await audio.ensureContext();
    await Promise.all(trial.options.map(({ file }) => audio.loadBuffer(file)));
    if (session !== active) return;
    await audio.playFile(target.file);
    if (session !== active) return;
    active.phase = 'heard';
    listen.textContent = '↻ Άκου ξανά';
    feedback.textContent = 'Ποια λέξη άκουσες; Διάλεξε κάρτα.';
    answers.forEach((button) => { button.disabled = false; });
  } catch {
    if (session !== active) return;
    active.phase = 'ready';
    feedback.textContent = 'Ο ήχος δεν άνοιξε. Πάτησε ξανά για επανάληψη.';
  } finally {
    if (session === active) listen.removeAttribute('aria-disabled');
  }
}

async function choose(index) {
  if (session?.phase !== 'heard') return;
  const active = session;
  const trial = currentTrial();
  const targetIndex = trial.options.findIndex((option) => option.target);
  const correct = index === targetIndex;
  const target = trial.options[targetIndex];
  const chosen = trial.options[index];
  active.phase = 'feedback';
  active.responses.push({ pair: trial.pair, speaker: trial.speaker, target: target.text, chosen: chosen.text, correct });

  answers.forEach((button) => { button.disabled = true; });
  answers[targetIndex].classList.add('correct');
  get('progress').value = active.responses.length;
  listen.hidden = true;
  feedback.textContent = correct ? 'Σωστή παράδοση!' : 'Άκου και τις δύο κάρτες με τη σειρά.';

  if (!correct) {
    answers[index].classList.add('chosen-wrong');
    try {
      const order = [targetIndex, index];
      await audio.playSequence([target.file, chosen.file], 400, {
        onStepStart: (step) => {
          if (session === active) answers[order[step]].classList.add('speaking');
        },
        onStepEnd: (step) => {
          if (session === active) answers[order[step]].classList.remove('speaking');
        },
      });
    } catch {
      if (session === active) feedback.textContent = 'Η επανάληψη του ήχου δεν ήταν διαθέσιμη.';
    } finally {
      if (session === active) answers.forEach((button) => button.classList.remove('speaking'));
    }
  }

  if (session !== active) return;
  if (!correct) {
    if (feedback.textContent === 'Άκου και τις δύο κάρτες με τη σειρά.') feedback.textContent = '';
    const word = document.createElement('strong');
    word.lang = 'en';
    word.textContent = target.text;
    feedback.append(' Η σωστή λέξη ήταν ', word, '.');
  }
  const done = active.responses.length === active.deck.length;
  next.textContent = done ? 'Δες το αποτέλεσμα →' : 'Επόμενη παράδοση →';
  next.hidden = false;
  if (document.activeElement === document.body || answers.includes(document.activeElement)) next.focus();
}

function finish() {
  const { world, student: code, responses } = session;
  const score = responses.filter((trial) => trial.correct).length;
  get('score').textContent = 'Σωστές παραδόσεις: ' + score + ' / ' + responses.length;
  get('save-status').textContent = '';
  if (code) {
    try {
      const date = new Date().toISOString();
      localStorage.setItem(storagePrefix + crypto.randomUUID(), JSON.stringify({
        code, date, world: world.id, responses,
      }));
      get('save-status').textContent = 'Ο γύρος αποθηκεύτηκε σε αυτή τη συσκευή.';
    } catch {
      get('save-status').textContent = 'Ο browser δεν μπόρεσε να αποθηκεύσει τον γύρο.';
    }
  }
  showScreen(results);
}

function showMap() {
  session = null;
  audio.stopAll();
  renderWorlds();
  showScreen(map);
}

function exportCsv() {
  const status = get('export-status');
  const rows = [['student_code', 'completed_at_utc', 'mission', 'delivery', 'pair', 'recording', 'target', 'chosen', 'correct']];
  try {
    const sessions = Object.keys(localStorage)
      .filter((key) => key.startsWith(storagePrefix))
      .map((key) => {
        try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
      })
      .filter((item) => Array.isArray(item?.responses) && typeof item.date === 'string')
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const { code, date, world, responses } of sessions) {
      responses.forEach(({ pair, speaker, target, chosen, correct }, index) => {
        rows.push([code, date, world, index + 1, pair, speaker, target, chosen, correct ? 1 : 0]);
      });
    }
  } catch {
    status.textContent = 'Η πρόσβαση στους αποθηκευμένους γύρους δεν ήταν διαθέσιμη.';
    return;
  }
  if (rows.length === 1) {
    status.textContent = 'Δεν υπάρχουν αποθηκευμένοι γύροι σε αυτή τη συσκευή.';
    return;
  }
  const csv = rows.map((row) =>
    row.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(',')
  ).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sound-delivery-results.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Δημιουργήθηκε το αρχείο CSV.';
}

listen.addEventListener('click', playClue);
answers.forEach((button, index) => button.addEventListener('click', () => choose(index)));
next.addEventListener('click', () => {
  if (!session || next.hidden) return;
  if (currentTrial()) {
    renderTrial();
    listen.focus();
  } else {
    finish();
  }
});
back.addEventListener('click', showMap);
get('results-map').addEventListener('click', showMap);
get('again').addEventListener('click', () => start(session.world));
get('export').addEventListener('click', exportCsv);
student.addEventListener('change', renderWorlds);
mission.addEventListener('keydown', (event) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (session?.phase === 'heard' && ['1', '2'].includes(event.key)) {
    event.preventDefault();
    choose(Number(event.key) - 1);
  }
});

async function loadWorlds() {
  try {
    const response = await fetch('./data/junior-pairs.json');
    if (!response.ok) throw new Error('Unable to load junior pairs');
    ({ worlds } = await response.json());
    renderWorlds();
    get('load-status').hidden = true;
  } catch {
    get('load-status').textContent = 'Οι αποστολές δεν φορτώθηκαν. Ανανέωσε τη σελίδα για νέα προσπάθεια.';
  }
}

loadWorlds();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

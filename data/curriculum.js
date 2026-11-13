/**
 * Sounds English to Me — Curriculum & Phonetic Interference Dataset
 * Original 1994 ToolBook 3 Application by Apostolos Kritsiniotis
 * MSc in Speech and Hearing Sciences, University College London (UCL)
 * Supervised by Prof. Mark Huckvale | Greek phonology: Nadia | Voice: Frederica
 */

export const SYSTEM_AUDIO = {
  welcome: 'WELLCOME.WAV',
  intro: 'INTRO.WAV',
  okey: 'OKEY.WAV',
  correct: ['CORRECT.WAV', 'WELLDONE.WAV', 'OKEY.WAV'],
  incorrect: ['TRYAGAIN.WAV', 'AREUSURE.WAV', 'AREUSURB.WAV'],
  haveAGo: 'HAVEAGO.WAV',
  pairDrill: 'PAIRDRIL.WAV',
  likeThat: 'LIKETHAT.WAV',
  example: 'EXAMPLE.WAV',
  unit: 'UNIT.WAV',
  and: 'AND.WAV',
  p: 'P.WAV',
};

export const CATEGORIES = [
  {
    id: 'consonants-sibilants',
    title: 'Consonants: Stops, Sibilants & Affricates',
    description:
      'Deconstructs Greek retracted [s̠] and unaspirated stop interference across Place, Manner, and Voicing.',
  },
  {
    id: 'consonants-nasals-schwa',
    title: 'Consonants & Weak Syllables: Nasals & Final Schwa',
    description:
      'Breaks Greek allophonic [ŋk] stop epenthesis and syllable-timed vowel resistance to weak final /ə/.',
  },
  {
    id: 'vowels-central-front',
    title: 'Vowels: Central /ɜː/ & Front Vowel Crowding',
    description:
      'Carves out English mid-central /ɜː/, lax /ɪ/, and low-front /æ/ from Greek’s 5-vowel cardinal grid.',
  },
  {
    id: 'vowels-back-diphthongs',
    title: 'Vowels & Diphthongs: Back Contrasts & Glides',
    description:
      'Separates /ɒ, ʌ, ɑː/, closing diphthongs /əʊ, aʊ/, and restored high-back /ʊ/ vs. /uː/.',
  },
];

export const CREDITS_1994 = {
  title: 'Sounds English to Me (Alpha)',
  subtitle: 'Pronunciation practice for Greek learners of English',
  author: 'Apostolos Kritsiniotis',
  year: '1994',
  degree: 'MSc in Speech & Hearing Sciences, University College London (UCL)',
  creditsText: `This book (it is really an application but I will call it a book just the same) is mainly my brainchild so I alone am responsible for its success or failure.

A lot of people however have helped, encouraged and advised me and I feel I must mention them. So first of all I must thank Mark Huckvale, project supervisor, for valuable guidance, Nadia for help on Greek phonology and Frederica for steering me towards some invaluable reference books. It is also her voice that you can listen to again and again and again . . .

Also on the Greek front, Panos for making it possible for some Greek speakers to test the application.`,
  copyrightNote:
    'Original 1994 Computer Assisted Language Learning (CALL) ToolBook 3.0 prototype preserved intact alongside its 240 PCM .WAV recordings.',
};

export const UNITS = [
  {
    id: 'example',
    number: 0,
    badge: 'Example',
    title: '/t/ vs. /d/',
    subtitle: 'town · down',
    category: 'consonants-sibilants',
    pamType: 'VOT / Aspiration & Pre-Nasal Interference',
    restored: false,
    unitAudio: ['EXAMPLE.WAV', 'T-AND-D.WAV'],
    phonemes: [
      {
        ipa: '/t/',
        label: 'Voiceless Aspirated Alveolar Stop [tʰ]',
        audio: 'TIP.WAV',
        frequencyHint: 'Long VOT ~60–80 ms burst',
        articulation: 'Tongue tip seals alveolar ridge; release with a strong puff of air.',
      },
      {
        ipa: '/d/',
        label: 'Voiced Alveolar Stop [d]',
        audio: 'DIP.WAV',
        frequencyHint: 'Short/negative VOT + vocal fold vibration',
        articulation: 'Tongue tip seals alveolar ridge; vocal folds vibrate with minimal breath burst.',
      },
    ],
    l1Interference: {
      summary:
        'Greek voiceless stops (/p, t, k/) are strictly unaspirated (~10–20 ms VOT), whereas English stressed initial /t/ carries strong aspiration [tʰ] (~60–80 ms).',
      greekSystem:
        'In Modern Greek, /t/ lacks aspiration and /d/ only exists reliably as a pre-nasalized stop or loanword segment ([nd]/[d] spelled ντ).',
      englishTarget:
        'English distinguishes initial /t/ from /d/ primarily via Voice Onset Time (aspiration burst) and word-finally via pre-fortis vowel clipping.',
      coachingTip:
        'Hold a tissue in front of your lips: for "tip, tie, town", the burst of air should visibly move the tissue; for "dip, die, down", keep the release gentle and voiced.',
      spectralMode: 'vot',
    },
    groups: [
      {
        id: 'ex-td',
        label: '/t/ vs. /d/ Contrast',
        contrastAudio: 'T-AND-D.WAV',
        items: [
          {
            words: [
              { text: 'tip', ipa: '/tɪp/', wav: 'TIP.WAV', altWavs: [] },
              { text: 'dip', ipa: '/dɪp/', wav: 'DIP.WAV', altWavs: ['DIPB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'too', ipa: '/tuː/', wav: 'TOO.WAV', altWavs: ['TWO.WAV', 'TWOB.WAV'] },
              { text: 'do', ipa: '/duː/', wav: 'DO.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'tie', ipa: '/taɪ/', wav: 'TIE.WAV', altWavs: [] },
              { text: 'die', ipa: '/daɪ/', wav: 'DIE.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'town', ipa: '/taʊn/', wav: 'TOWN.WAV', altWavs: ['TOWNB.WAV'] },
              { text: 'down', ipa: '/daʊn/', wav: 'DOWN.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit1',
    number: 1,
    badge: 'Unit 1',
    title: '/s/ vs. /ʃ/',
    subtitle: 'sip · ship',
    category: 'consonants-sibilants',
    pamType: 'PAM-L2: Single-Category (SC) Merger',
    restored: false,
    unitAudio: ['UNIT1.WAV', 'SAND_SS.WAV'],
    phonemes: [
      {
        ipa: '/s/',
        label: 'Sharp Alveolar Fricative',
        audio: 'SIP.WAV',
        frequencyHint: 'Spectral peak 6,000–8,000 Hz',
        articulation: 'Spread lips, tongue tip/blade close to alveolar ridge; high-pitched hissing noise.',
      },
      {
        ipa: '/ʃ/',
        label: 'Rounded Postalveolar Fricative',
        audio: 'SHIP.WAV',
        frequencyHint: 'Spectral peak 2,500–3,500 Hz',
        articulation: 'Protrude & round lips; retract tongue blade toward hard palate; lower hushing noise.',
      },
    ],
    l1Interference: {
      summary:
        'Greek has no /ʃ/ phoneme (as in "she", "ship"). Because Greek /s/ has no postalveolar competitor, it is produced as a retracted [s̠] right in the acoustic middle (~4.5–5.5 kHz).',
      greekSystem:
        'Single voiceless sibilant /s/ ([s̠]) absorbs both English /s/ and /ʃ/ into one wide perceptual magnet (PAM-L2 Single-Category assimilation).',
      englishTarget:
        'English /s/ concentrates frication energy above 6 kHz; /ʃ/ lowers the spectral centroid to 2.5–3.5 kHz via tongue retraction and lip rounding.',
      coachingTip:
        'Use the live Spectrum Meter! For /s/ ("sea, sip"), smile slightly and push energy above 6 kHz. For /ʃ/ ("she, ship"), round your lips forward like blowing a kiss and aim energy near 3 kHz.',
      spectralMode: 'sibilant',
    },
    groups: [
      {
        id: 'u1-main',
        label: '/s/ vs. /ʃ/ Minimal Pairs',
        contrastAudio: 'SAND_SS.WAV',
        items: [
          {
            words: [
              { text: 'sip', ipa: '/sɪp/', wav: 'SIP.WAV', altWavs: [] },
              { text: 'ship', ipa: '/ʃɪp/', wav: 'SHIP.WAV', altWavs: ['SHIPB.WAV', 'SHIPC.WAV'] },
            ],
          },
          {
            words: [
              { text: 'seat', ipa: '/siːt/', wav: 'SEAT.WAV', altWavs: [] },
              { text: 'sheet', ipa: '/ʃiːt/', wav: 'SHEET.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'sign', ipa: '/saɪn/', wav: 'SIGN.WAV', altWavs: [] },
              { text: 'shine', ipa: '/ʃaɪn/', wav: 'SHINE.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'sin', ipa: '/sɪn/', wav: 'SIN.WAV', altWavs: [] },
              { text: 'shin', ipa: '/ʃɪn/', wav: 'SHIN.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'sue', ipa: '/suː/', wav: 'SUE.WAV', altWavs: [] },
              { text: 'shoe', ipa: '/ʃuː/', wav: 'SHOE.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'sell', ipa: '/sel/', wav: 'SELL.WAV', altWavs: [] },
              { text: 'shell', ipa: '/ʃel/', wav: 'SHELL.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'save', ipa: '/seɪv/', wav: 'SAVE.WAV', altWavs: [] },
              { text: 'shave', ipa: '/ʃeɪv/', wav: 'SHAVE.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit2',
    number: 2,
    badge: 'Unit 2',
    title: '/ts/ vs. /tʃ/',
    subtitle: 'cats · catch',
    category: 'consonants-sibilants',
    pamType: 'PAM-L2: Category-Goodness (CG) Merger',
    restored: false,
    unitAudio: ['UNIT2.WAV', 'TSANDTSS.WAV'],
    phonemes: [
      {
        ipa: '/ts/',
        label: 'Alveolar Stop + Sharp Fricative',
        audio: 'CATS.WAV',
        frequencyHint: 'Release frication > 5.5 kHz',
        articulation: 'Alveolar /t/ release directly into sharp /s/ with spread lips.',
      },
      {
        ipa: '/tʃ/',
        label: 'Postalveolar Affricate',
        audio: 'CATCH.WAV',
        frequencyHint: 'Release frication ~2.5–3.8 kHz',
        articulation: 'Tongue blade seals postalveolar zone and releases into rounded /ʃ/.',
      },
    ],
    l1Interference: {
      summary:
        'Greek possesses marginal /ts/ (τσάι), pronounced retracted as [t͡s̠]. Learners assimilate English /tʃ/ ("catch, witch") to Greek /ts/ ("cats, wits").',
      greekSystem:
        'Greek [t͡s̠] is treated as a good match for English /ts/ and a passable substitute for /tʃ/, causing morphological confusion on English -s plurals.',
      englishTarget:
        'English /ts/ keeps the release high-pitched (>5.5 kHz) and unrounded; /tʃ/ lowers the frication burst (~3 kHz) with lip rounding.',
      coachingTip:
        'In "cats, coats, arts", keep lips flat and teeth close on the final -s. In "catch, coach, arch", round the lips before releasing the tongue.',
      spectralMode: 'sibilant',
    },
    groups: [
      {
        id: 'u2-main',
        label: '/ts/ vs. /tʃ/ Minimal Pairs',
        contrastAudio: 'TSANDTSS.WAV',
        items: [
          {
            words: [
              { text: 'wits', ipa: '/wɪts/', wav: 'WITS.WAV', altWavs: [] },
              { text: 'witch', ipa: '/wɪtʃ/', wav: 'WITCH.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'cats', ipa: '/kæts/', wav: 'CATS.WAV', altWavs: [] },
              { text: 'catch', ipa: '/kætʃ/', wav: 'CATCH.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'eats', ipa: '/iːts/', wav: 'EATS.WAV', altWavs: [] },
              { text: 'each', ipa: '/iːtʃ/', wav: 'EACH.WAV', altWavs: ['EACHB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'arts', ipa: '/ɑːts/', wav: 'ARTS.WAV', altWavs: [] },
              { text: 'arch', ipa: '/ɑːtʃ/', wav: 'ARCH.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'coats', ipa: '/kəʊts/', wav: 'COATS.WAV', altWavs: [] },
              { text: 'coach', ipa: '/kəʊtʃ/', wav: 'COACH.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit3',
    number: 3,
    badge: 'Unit 3',
    title: '/dʒ/ vs. /tʃ/',
    subtitle: 'joke · choke',
    category: 'consonants-sibilants',
    pamType: 'PAM-L2: Novel Voicing & Pre-Fortis Clipping',
    restored: false,
    unitAudio: ['UNIT3.WAV', 'DZANDTSS.WAV'],
    altUnitAudio: ['UNIT3B.WAV', 'DZANDTSB.WAV'],
    phonemes: [
      {
        ipa: '/dʒ/',
        label: 'Voiced/Lenis Postalveolar Affricate',
        audio: 'JOKE.WAV',
        frequencyHint: 'Voiced closure + gentle release; lengthens preceding vowel',
        articulation: 'Vocal folds vibrate; gentle release with no strong breath burst.',
      },
      {
        ipa: '/tʃ/',
        label: 'Voiceless/Fortis Postalveolar Affricate',
        audio: 'CHOKE.WAV',
        frequencyHint: 'Strong voiceless burst; clips preceding vowel',
        articulation: 'No vocal fold vibration; strong aspirated burst on release.',
      },
    ],
    l1Interference: {
      summary:
        'Neither /dʒ/ nor /tʃ/ exists in Standard Modern Greek; learners map them to Greek /dz/ (τζ) and /ts/ (τσ), and miss English final vowel-length cues.',
      greekSystem:
        'Greek [d͡z̠] and [t͡s̠] lack aspiration contrasts and never occur word-finally in native Greek words.',
      englishTarget:
        'Initially, /tʃ/ has longer voiceless frication/aspiration than /dʒ/. Word-finally ("ridge" vs "rich"), the vowel before /dʒ/ is noticeably longer than before /tʃ/.',
      coachingTip:
        'For "ridge / edge", let the vowel ring longer before closing into the voiced affricate. For "rich / etch", clip the vowel short and push a sharp breathy burst.',
      spectralMode: 'vot',
    },
    groups: [
      {
        id: 'u3-main',
        label: '/dʒ/ vs. /tʃ/ Minimal Pairs',
        contrastAudio: 'DZANDTSS.WAV',
        items: [
          {
            words: [
              { text: 'gin', ipa: '/dʒɪn/', wav: 'GIN.WAV', altWavs: [] },
              { text: 'chin', ipa: '/tʃɪn/', wav: 'CHIN.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'joke', ipa: '/dʒəʊk/', wav: 'JOKE.WAV', altWavs: [] },
              { text: 'choke', ipa: '/tʃəʊk/', wav: 'CHOKE.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'junk', ipa: '/dʒʌŋk/', wav: 'JUNK.WAV', altWavs: [] },
              { text: 'chunk', ipa: '/tʃʌŋk/', wav: 'CHUNK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'Jane', ipa: '/dʒeɪn/', wav: 'JANE.WAV', altWavs: [] },
              { text: 'chain', ipa: '/tʃeɪn/', wav: 'CHAIN.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'edge', ipa: '/edʒ/', wav: 'EDGE.WAV', altWavs: [] },
              { text: 'etch', ipa: '/etʃ/', wav: 'ETCH.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'ridge', ipa: '/rɪdʒ/', wav: 'RIDGE.WAV', altWavs: [] },
              { text: 'rich', ipa: '/rɪtʃ/', wav: 'RICH.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit4',
    number: 4,
    badge: 'Unit 4',
    title: '/ʃ/ vs. /tʃ/',
    subtitle: 'ship · chip',
    category: 'consonants-sibilants',
    pamType: 'Manner Contrast: Fricative vs. Affricate',
    restored: false,
    unitAudio: ['UNIT4.WAV', 'SSANDTSS.WAV'],
    phonemes: [
      {
        ipa: '/ʃ/',
        label: 'Postalveolar Fricative (Continuous)',
        audio: 'SHIP.WAV',
        frequencyHint: 'Gradual friction onset; no silent closure gap',
        articulation: 'Air flows continuously through narrow postalveolar channel without stopping.',
      },
      {
        ipa: '/tʃ/',
        label: 'Postalveolar Affricate (Stop + Release)',
        audio: 'CHIP.WAV',
        frequencyHint: 'Silent closure gap followed by explosive burst',
        articulation: 'Tongue completely blocks airflow first, then bursts open into short /ʃ/.',
      },
    ],
    l1Interference: {
      summary:
        'When Greek learners acquire unfamiliar postalveolar articulation, they often conflate continuous /ʃ/ ("ship, wash") with stop-initiated /tʃ/ ("chip, watch").',
      greekSystem:
        'Greek lacks postalveolars entirely; learners hyper-correct or insert a stop onset onto /ʃ/ or drop the closure on /tʃ/.',
      englishTarget:
        '/ʃ/ has continuous turbulent airflow (can be sustained for 2+ seconds); /tʃ/ requires a brief full silent stop closure before the burst.',
      coachingTip:
        'Watch the Waveform! "chip" and "watch" show a silent flat gap right before an explosive spike; "ship" and "wash" show smooth, sustained noise.',
      spectralMode: 'vot',
    },
    groups: [
      {
        id: 'u4-main',
        label: '/ʃ/ vs. /tʃ/ Minimal Pairs',
        contrastAudio: 'SSANDTSS.WAV',
        items: [
          {
            words: [
              { text: 'ship', ipa: '/ʃɪp/', wav: 'SHIP.WAV', altWavs: ['SHIPB.WAV', 'SHIPC.WAV'] },
              { text: 'chip', ipa: '/tʃɪp/', wav: 'CHIP.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'share', ipa: '/ʃeə/', wav: 'SHARE.WAV', altWavs: [] },
              { text: 'chair', ipa: '/tʃeə/', wav: 'CHAIR.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'shop', ipa: '/ʃɒp/', wav: 'SHOP.WAV', altWavs: ['SHOPB.WAV'] },
              { text: 'chop', ipa: '/tʃɒp/', wav: 'CHOP.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'wash', ipa: '/wɒʃ/', wav: 'WASH.WAV', altWavs: [] },
              { text: 'watch', ipa: '/wɒtʃ/', wav: 'WATCH.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'sheep', ipa: '/ʃiːp/', wav: 'SHEEP.WAV', altWavs: ['SHEEPB.WAV', 'SHEEPC.WAV'] },
              { text: 'cheap', ipa: '/tʃiːp/', wav: 'CHEAP.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit5',
    number: 5,
    badge: 'Unit 5',
    title: '/ŋ/ vs. /ŋk/',
    subtitle: 'sing · sink',
    category: 'consonants-nasals-schwa',
    pamType: 'Allophonic Neutralization & Stop Epenthesis',
    restored: false,
    unitAudio: ['UNIT5.WAV', 'NANDNK.WAV'],
    phonemes: [
      {
        ipa: '/ŋ/',
        label: 'Pure Velar Nasal',
        audio: 'SING.WAV',
        frequencyHint: 'Sustained nasal murmur; fades cleanly',
        articulation: 'Back of tongue seals against soft palate; air flows purely through nose without /k/ or /ɡ/ release.',
      },
      {
        ipa: '/ŋk/',
        label: 'Velar Nasal + Voiceless Velar Stop',
        audio: 'SINK.WAV',
        frequencyHint: 'Short clipped nasal followed by /k/ burst',
        articulation: 'Brief velar nasal followed by silent pressure buildup and sharp /k/ release.',
      },
    ],
    l1Interference: {
      summary:
        'In Greek, [ŋ] is never an independent phoneme—it only occurs as a positional allophone of /n/ before velar stops (/k, ɡ/, e.g. άγκυρα, άγχος).',
      greekSystem:
        'Because Greek [ŋ] is always coupled to a following velar consonant, Greek learners automatically insert an epenthetic [k] or [ɡ] at the end of English "-ng" words.',
      englishTarget:
        'English /ŋ/ ends smoothly with nasal resonance and no oral burst; /ŋk/ clips the nasal shorter and ends with a distinct voiceless /k/ release.',
      coachingTip:
        'Keep the back of your tongue pressed against the soft palate as your voice stops—do NOT drop the tongue while air pressure is built up, or an accidental [k]/[ɡ] will pop out.',
      spectralMode: 'nasal',
    },
    groups: [
      {
        id: 'u5-main',
        label: '/ŋ/ vs. /ŋk/ Minimal Pairs',
        contrastAudio: 'NANDNK.WAV',
        items: [
          {
            words: [
              { text: 'sing', ipa: '/sɪŋ/', wav: 'SING.WAV', altWavs: [] },
              { text: 'sink', ipa: '/sɪŋk/', wav: 'SINK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'bang', ipa: '/bæŋ/', wav: 'BANG.WAV', altWavs: [] },
              { text: 'bank', ipa: '/bæŋk/', wav: 'BANK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'thing', ipa: '/θɪŋ/', wav: 'THING.WAV', altWavs: [] },
              { text: 'think', ipa: '/θɪŋk/', wav: 'THINK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'hung', ipa: '/hʌŋ/', wav: 'HUNG.WAV', altWavs: [] },
              { text: 'hunk', ipa: '/hʌŋk/', wav: 'HUNK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'rang', ipa: '/ræŋ/', wav: 'RANG.WAV', altWavs: [] },
              { text: 'rank', ipa: '/ræŋk/', wav: 'RANK.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit6',
    number: 6,
    badge: 'Unit 6',
    title: '/∅/ vs. /ə/',
    subtitle: 'date · data',
    category: 'consonants-nasals-schwa',
    pamType: 'Prosodic Reduction & Final Schwa Epenthesis',
    restored: false,
    unitAudio: ['UNIT6.WAV', 'FINALSWA.WAV'],
    phonemes: [
      {
        ipa: '/∅/',
        label: 'Closed Syllable (No Final Vowel)',
        audio: 'DATE.WAV',
        frequencyHint: 'Ends cleanly on coda consonant',
        articulation: 'Hold or release final consonant lightly without adding a trailing vowel.',
      },
      {
        ipa: '/ə/',
        label: 'Unstressed Final Schwa',
        audio: 'DATA.WAV',
        frequencyHint: 'Short, relaxed mid-central vowel (~500/1500 Hz)',
        articulation: 'Completely relaxed tongue and jaw; brief, quiet unstressed syllable—not a full Greek /a/.',
      },
    ],
    l1Interference: {
      summary:
        'Greek is syllable-timed with 5 full, unreduced vowels and forbids most word-final stops/codas, causing two opposite errors: adding a spurious vowel after English codas ("dat-a") or over-stressing real final /ə/ as full /a/.',
      greekSystem:
        'Greek lacks vowel reduction (/ə/) and prefers open CV syllables.',
      englishTarget:
        'Notice the sharp rhythm contrast: "date" is 1 clean syllable ending on /t/, while "data" adds a soft, brief unstressed /ə/ without turning it into stressed Greek /a/.',
      coachingTip:
        'Listen for two things: 1) Does the final consonant release into a vowel? 2) Keep the schwa in "cola, Anna, data" relaxed and quiet compared to the stressed first syllable.',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u6-main',
        label: 'Zero vs. Final Schwa (/ə/)',
        contrastAudio: 'FINALSWA.WAV',
        items: [
          {
            words: [
              { text: 'coal', ipa: '/kəʊl/', wav: 'COAL.WAV', altWavs: [] },
              { text: 'cola', ipa: '/ˈkəʊlə/', wav: 'COLA.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'Ann', ipa: '/æn/', wav: 'ANN.WAV', altWavs: [] },
              { text: 'Anna', ipa: '/ˈænə/', wav: 'ANNA.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'tube', ipa: '/tjuːb/', wav: 'TUBE.WAV', altWavs: [] },
              { text: 'tuba', ipa: '/ˈtjuːbə/', wav: 'TUBA.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'date', ipa: '/deɪt/', wav: 'DATE.WAV', altWavs: [] },
              { text: 'data', ipa: '/ˈdeɪtə/', wav: 'DATA.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'cube', ipa: '/kjuːb/', wav: 'CUBE.WAV', altWavs: [] },
              { text: 'Cuba', ipa: '/ˈkjuːbə/', wav: 'CUBA.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit7',
    number: 7,
    badge: 'Unit 7',
    title: '/ɜː/ vs. /e, ɔː, ɑː/',
    subtitle: 'bird · bed · board',
    category: 'vowels-central-front',
    pamType: 'Vowel Space Starvation: The Empty Center',
    restored: false,
    unitAudio: ['UNIT7A.WAV', '3ANDE.WAV'],
    altUnitAudio: ['UNIT7B.WAV', '3ANDOO.WAV', 'UNIT7C.WAV', '3ANDAA.WAV'],
    phonemes: [
      {
        ipa: '/ɜː/',
        label: 'Long Mid-Central Vowel (NURSE)',
        audio: '33.WAV',
        frequencyHint: 'Neutral F1 ~500 Hz, F2 ~1500 Hz',
        articulation: 'Tongue relaxed in dead center of mouth; neutral unrounded lips (do NOT pronounce an r!).',
      },
      {
        ipa: '/e/',
        label: 'Short Mid-Front Vowel (DRESS)',
        audio: 'E.WAV',
        frequencyHint: 'Higher F2 (~1900 Hz)',
        articulation: 'Tongue pushed forward and slightly raised.',
      },
      {
        ipa: '/ɔː/',
        label: 'Long Open-Mid Back Rounded (THOUGHT)',
        audio: 'OO.WAV',
        frequencyHint: 'Low F2 (~850 Hz), rounded lips',
        articulation: 'Tongue pulled back, lips firmly rounded.',
      },
      {
        ipa: '/ɑː/',
        label: 'Long Open Back Unrounded (PALM)',
        audio: 'AA.WAV',
        frequencyHint: 'High F1 (~700 Hz), low F2 (~1100 Hz)',
        articulation: 'Jaw lowered wide, tongue flat and back.',
      },
    ],
    l1Interference: {
      summary:
        'Greek has NO central vowels at all—the entire center of the Greek vowel space is empty! Learners scatter English /ɜː/ ("bird, work, burn") outward to Greek /e/, /o/, or /a/, often misled by spelling ("er, or, ir, ur").',
      greekSystem:
        'Five perimeter cardinal vowels (/i, e, a, o, u/) pull central /ɜː/ toward whichever peripheral vowel resembles the orthography.',
      englishTarget:
        'In Southern British English (RP), /ɜː/ is non-rhotic (no /r/ consonant) and holds steady central formants (F1 ~500 Hz, F2 ~1500 Hz) with relaxed lips.',
      coachingTip:
        'Keep your lips completely neutral (unlike "board") and your tongue relaxed in the middle (neither front like "bed" nor wide open like "barn").',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u7-triplet',
        label: '3-Way Anchor (/ɜː/ · /e/ · /ɔː/)',
        contrastAudio: '3ANDE.WAV',
        items: [
          {
            words: [
              { text: 'bird', ipa: '/bɜːd/', wav: 'BIRD.WAV', altWavs: ['BIRDB.WAV'] },
              { text: 'bed', ipa: '/bed/', wav: 'BED.WAV', altWavs: ['BEDB.WAV'] },
              { text: 'board', ipa: '/bɔːd/', wav: 'BOARD.WAV', altWavs: [] },
            ],
          },
        ],
      },
      {
        id: 'u7-e',
        label: '7A: /ɜː/ vs. /e/',
        contrastAudio: '3ANDE.WAV',
        items: [
          {
            words: [
              { text: 'turn', ipa: '/tɜːn/', wav: 'TURN.WAV', altWavs: [] },
              { text: 'ten', ipa: '/ten/', wav: 'TEN.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'earned', ipa: '/ɜːnd/', wav: 'EARNED.WAV', altWavs: [] },
              { text: 'end', ipa: '/end/', wav: 'END.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'worst', ipa: '/wɜːst/', wav: 'WORST.WAV', altWavs: [] },
              { text: 'west', ipa: '/west/', wav: 'WEST.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'bird', ipa: '/bɜːd/', wav: 'BIRD.WAV', altWavs: ['BIRDB.WAV'] },
              { text: 'bed', ipa: '/bed/', wav: 'BED.WAV', altWavs: ['BEDB.WAV'] },
            ],
          },
        ],
      },
      {
        id: 'u7-oo',
        label: '7B: /ɜː/ vs. /ɔː/',
        contrastAudio: '3ANDOO.WAV',
        items: [
          {
            words: [
              { text: 'work', ipa: '/wɜːk/', wav: 'WORK.WAV', altWavs: [] },
              { text: 'walk', ipa: '/wɔːk/', wav: 'WALK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'worm', ipa: '/wɜːm/', wav: 'WORM.WAV', altWavs: [] },
              { text: 'warm', ipa: '/wɔːm/', wav: 'WARM.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'bird', ipa: '/bɜːd/', wav: 'BIRD.WAV', altWavs: ['BIRDB.WAV'] },
              { text: 'board', ipa: '/bɔːd/', wav: 'BOARD.WAV', altWavs: [] },
            ],
          },
        ],
      },
      {
        id: 'u7-aa',
        label: '7C: /ɜː/ vs. /ɑː/',
        contrastAudio: '3ANDAA.WAV',
        items: [
          {
            words: [
              { text: 'burn', ipa: '/bɜːn/', wav: 'BURN.WAV', altWavs: [] },
              { text: 'barn', ipa: '/bɑːn/', wav: 'BARN.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'heard', ipa: '/hɜːd/', wav: 'HEARD.WAV', altWavs: [] },
              { text: 'hard', ipa: '/hɑːd/', wav: 'HARD.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'firm', ipa: '/fɜːm/', wav: 'FIRM.WAV', altWavs: [] },
              { text: 'farm', ipa: '/fɑːm/', wav: 'FARM.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit8',
    number: 8,
    badge: 'Unit 8',
    title: '/ɪ/ vs. /iː/',
    subtitle: 'ship · sheep',
    category: 'vowels-central-front',
    pamType: 'PAM-L2: Category-Goodness & Cue-Weighting Trap',
    restored: false,
    unitAudio: ['UNIT8.WAV', 'IANDII.WAV'],
    phonemes: [
      {
        ipa: '/ɪ/',
        label: 'Short Lax High-Front/Centralized (KIT)',
        audio: 'SHIP.WAV',
        frequencyHint: 'Higher F1 (~420 Hz), lower F2 (~1950 Hz)',
        articulation: 'Relaxed tongue slightly lower and further back than Greek /i/.',
      },
      {
        ipa: '/iː/',
        label: 'Long Tense High-Front (FLEECE)',
        audio: 'SHEEP.WAV',
        frequencyHint: 'Low F1 (~280 Hz), high F2 (~2300 Hz)',
        articulation: 'Tense tongue high and forward near hard palate; longer duration.',
      },
    ],
    l1Interference: {
      summary:
        'Greek has only one high-front vowel /i/, without tense/lax spectral contrast or phonemic length. Greek speakers merge both English /ɪ/ ("ship, live") and /iː/ ("sheep, leave") into Greek /i/.',
      greekSystem:
        'Greek /i/ sits acoustically closer to English /iː/, causing L1 listeners to over-rely on duration alone instead of vowel quality.',
      englishTarget:
        'Duration is unreliable before voiceless consonants ("beat" vs "bid"): the core distinction is spectral quality—/ɪ/ is measurably lower and more centralized (toward /e/) than /iː/.',
      coachingTip:
        'Do not just make "sheep" longer and "ship" shorter! Relax your tongue slightly down and back for /ɪ/ ("bin, bit, dip, ship")—almost a tiny step toward /e/.',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u8-main',
        label: '/ɪ/ vs. /iː/ Minimal Pairs',
        contrastAudio: 'IANDII.WAV',
        items: [
          {
            words: [
              { text: 'bin', ipa: '/bɪn/', wav: 'BIN.WAV', altWavs: [] },
              { text: 'bean', ipa: '/biːn/', wav: 'BEAN.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'live', ipa: '/lɪv/', wav: 'LIVE.WAV', altWavs: [] },
              { text: 'leave', ipa: '/liːv/', wav: 'LEAVE.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'did', ipa: '/dɪd/', wav: 'DID.WAV', altWavs: ['DIDB.WAV'] },
              { text: 'deed', ipa: '/diːd/', wav: 'DEED.WAV', altWavs: ['DEEDB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'bit', ipa: '/bɪt/', wav: 'BIT.WAV', altWavs: [] },
              { text: 'beat', ipa: '/biːt/', wav: 'BEAT.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'dip', ipa: '/dɪp/', wav: 'DIP.WAV', altWavs: ['DIPB.WAV'] },
              { text: 'deep', ipa: '/diːp/', wav: 'DEEP.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'ship', ipa: '/ʃɪp/', wav: 'SHIP.WAV', altWavs: ['SHIPB.WAV', 'SHIPC.WAV'] },
              { text: 'sheep', ipa: '/ʃiːp/', wav: 'SHEEP.WAV', altWavs: ['SHEEPB.WAV', 'SHEEPC.WAV'] },
            ],
          },
          {
            words: [
              { text: 'itch', ipa: '/ɪtʃ/', wav: 'ITCH.WAV', altWavs: [] },
              { text: 'each', ipa: '/iːtʃ/', wav: 'EACH.WAV', altWavs: ['EACHB.WAV'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit9',
    number: 9,
    badge: 'Unit 9',
    title: '/æ/ vs. /e, ʌ, ɑː/',
    subtitle: 'bad · bed · bud',
    category: 'vowels-central-front',
    pamType: 'PAM-L2: 3-into-1 Low Vowel Crowding',
    restored: false,
    unitAudio: ['UNIT9.WAV', 'AEANDE.WAV'],
    altUnitAudio: ['AEANDV.WAV', 'AEANDAA.WAV'],
    phonemes: [
      {
        ipa: '/æ/',
        label: 'Open-Front Vowel (TRAP)',
        audio: 'AE.WAV',
        frequencyHint: 'High F1 (~700 Hz) + Front F2 (~1750 Hz)',
        articulation: 'Open jaw wide like /a/, while keeping tongue front and slightly spread like /e/.',
      },
      {
        ipa: '/e/',
        label: 'Mid-Front Vowel (DRESS)',
        audio: 'E.WAV',
        frequencyHint: 'Mid F1 (~530 Hz) + Front F2 (~1900 Hz)',
        articulation: 'Jaw only half-open; tongue mid-front.',
      },
      {
        ipa: '/ʌ/',
        label: 'Short Open-Mid Central (STRUT)',
        audio: 'V.WAV',
        frequencyHint: 'Central F2 (~1250 Hz)',
        articulation: 'Relaxed central tongue, slightly open jaw, short duration.',
      },
      {
        ipa: '/ɑː/',
        label: 'Long Open Back (PALM)',
        audio: 'AA.WAV',
        frequencyHint: 'Low F2 (~1100 Hz), long duration',
        articulation: 'Tongue retracted back in throat, jaw open, long steady vowel.',
      },
    ],
    l1Interference: {
      summary:
        'Greek has only /e/ and /a/ in the lower-front space, whereas English packs four distinct vowels (/e, æ, ʌ, ɑː/) into that region—causing massive 3-into-1 perceptual crowding.',
      greekSystem:
        'Greek /a/ lies centrally between English /æ/, /ʌ/, and /ɑː/, while Greek /e/ competes for /æ/ ("bad" sounds like "bed" or "bud").',
      englishTarget:
        '/æ/ pairs wide jaw opening (high F1) with a front tongue position (high F2); /ʌ/ is central and short; /ɑː/ is retracted back and long.',
      coachingTip:
        'To hit /æ/ ("bad, cat, man"), prepare to say Greek /e/ so your tongue stays forward, then drop your jaw wide open as if saying /a/.',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u9-triplets',
        label: '3-Way Low Vowel Triplets',
        contrastAudio: 'AEANDE.WAV',
        items: [
          {
            words: [
              { text: 'bad', ipa: '/bæd/', wav: 'BAD.WAV', altWavs: ['BADB.WAV'] },
              { text: 'bed', ipa: '/bed/', wav: 'BED.WAV', altWavs: ['BEDB.WAV'] },
              { text: 'bud', ipa: '/bʌd/', wav: 'BUD.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'hat', ipa: '/hæt/', wav: 'HAT.WAV', altWavs: [] },
              { text: 'hut', ipa: '/hʌt/', wav: 'HUT.WAV', altWavs: [] },
              { text: 'heart', ipa: '/hɑːt/', wav: 'HEART.WAV', altWavs: ['HEARTB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'ham', ipa: '/hæm/', wav: 'HAM.WAV', altWavs: ['HAMB.WAV'] },
              { text: 'hum', ipa: '/hʌm/', wav: 'HUM.WAV', altWavs: [] },
              { text: 'harm', ipa: '/hɑːm/', wav: 'HARM.WAV', altWavs: [] },
            ],
          },
        ],
      },
      {
        id: 'u9-e',
        label: '9A: /æ/ vs. /e/',
        contrastAudio: 'AEANDE.WAV',
        items: [
          {
            words: [
              { text: 'bad', ipa: '/bæd/', wav: 'BAD.WAV', altWavs: ['BADB.WAV'] },
              { text: 'bed', ipa: '/bed/', wav: 'BED.WAV', altWavs: ['BEDB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'mat', ipa: '/mæt/', wav: 'MAT.WAV', altWavs: [] },
              { text: 'met', ipa: '/met/', wav: 'MET.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'man', ipa: '/mæn/', wav: 'MAN.WAV', altWavs: [] },
              { text: 'men', ipa: '/men/', wav: 'MEN.WAV', altWavs: [] },
            ],
          },
        ],
      },
      {
        id: 'u9-v',
        label: '9B: /æ/ vs. /ʌ/',
        contrastAudio: 'AEANDV.WAV',
        items: [
          {
            words: [
              { text: 'cat', ipa: '/kæt/', wav: 'CAT.WAV', altWavs: [] },
              { text: 'cut', ipa: '/kʌt/', wav: 'CUT.WAV', altWavs: ['CUTB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'bad', ipa: '/bæd/', wav: 'BAD.WAV', altWavs: ['BADB.WAV'] },
              { text: 'bud', ipa: '/bʌd/', wav: 'BUD.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'ham', ipa: '/hæm/', wav: 'HAM.WAV', altWavs: ['HAMB.WAV'] },
              { text: 'hum', ipa: '/hʌm/', wav: 'HUM.WAV', altWavs: [] },
            ],
          },
        ],
      },
      {
        id: 'u9-aa',
        label: '9C: /æ/ vs. /ɑː/',
        contrastAudio: 'AEANDAA.WAV',
        items: [
          {
            words: [
              { text: 'hat', ipa: '/hæt/', wav: 'HAT.WAV', altWavs: [] },
              { text: 'heart', ipa: '/hɑːt/', wav: 'HEART.WAV', altWavs: ['HEARTB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'ham', ipa: '/hæm/', wav: 'HAM.WAV', altWavs: ['HAMB.WAV'] },
              { text: 'harm', ipa: '/hɑːm/', wav: 'HARM.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'back', ipa: '/bæk/', wav: 'BACK.WAV', altWavs: [] },
              { text: 'bark', ipa: '/bɑːk/', wav: 'BARK.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit10',
    number: 10,
    badge: 'Unit 10',
    title: '/ɒ/ vs. /ʌ, ɑː/',
    subtitle: 'hot · hut · heart',
    category: 'vowels-back-diphthongs',
    pamType: 'Orthographic "o" Trap & Back Vowel Split',
    restored: false,
    unitAudio: ['UNIT10.WAV', 'AANDV.WAV'],
    altUnitAudio: ['AANDAA.WAV'],
    phonemes: [
      {
        ipa: '/ɒ/',
        label: 'Short Open Back Slightly Rounded (LOT)',
        audio: 'A.WAV',
        frequencyHint: 'Low F2 (~950 Hz), short duration',
        articulation: 'Open jaw wide in back of mouth with light lip rounding; very short.',
      },
      {
        ipa: '/ʌ/',
        label: 'Short Open-Mid Central Unrounded (STRUT)',
        audio: 'V.WAV',
        frequencyHint: 'Higher F2 (~1250 Hz), unrounded',
        articulation: 'Neutral unrounded lips, central tongue—even when spelled with "o" (wonder, colour).',
      },
      {
        ipa: '/ɑː/',
        label: 'Long Open Back Unrounded (PALM)',
        audio: 'AA.WAV',
        frequencyHint: 'Long duration, unrounded',
        articulation: 'Long, relaxed open back vowel with no lip rounding.',
      },
    ],
    l1Interference: {
      summary:
        'Greek speakers merge /ʌ/ spelled with "o" ("wonder, colour") into /o/ ("wander, collar"), and confuse short open-back /ɒ/ ("shock, shop") with long /ɑː/ ("shark, sharp").',
      greekSystem:
        'Greek /o/ is mid-back and firmly rounded; English /ɒ/ is much more open and shorter, while /ʌ/ is unrounded and central.',
      englishTarget:
        'Keep "wonder, colour, hut, dull" completely unrounded and central (/ʌ/), while "hot, collar, shock" stay open-back and short (/ɒ/).',
      coachingTip:
        'Beware of English spelling! "colour" and "wonder" contain /ʌ/ (same vowel as "hut"), NOT an "o" sound. Smile gently so your lips do not round.',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u10-triplet',
        label: '3-Way Anchor (/ɒ/ · /ʌ/ · /ɑː/)',
        contrastAudio: 'AANDV.WAV',
        items: [
          {
            words: [
              { text: 'hot', ipa: '/hɒt/', wav: 'HOT.WAV', altWavs: ['HOTB.WAV'] },
              { text: 'hut', ipa: '/hʌt/', wav: 'HUT.WAV', altWavs: [] },
              { text: 'heart', ipa: '/hɑːt/', wav: 'HEART.WAV', altWavs: ['HEARTB.WAV'] },
            ],
          },
        ],
      },
      {
        id: 'u10-v',
        label: '10A: /ɒ/ vs. /ʌ/',
        contrastAudio: 'AANDV.WAV',
        items: [
          {
            words: [
              { text: 'hot', ipa: '/hɒt/', wav: 'HOT.WAV', altWavs: ['HOTB.WAV'] },
              { text: 'hut', ipa: '/hʌt/', wav: 'HUT.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'doll', ipa: '/dɒl/', wav: 'DOLL.WAV', altWavs: [] },
              { text: 'dull', ipa: '/dʌl/', wav: 'DULL.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'cot', ipa: '/kɒt/', wav: 'COT.WAV', altWavs: [] },
              { text: 'cut', ipa: '/kʌt/', wav: 'CUT.WAV', altWavs: ['CUTB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'jog', ipa: '/dʒɒɡ/', wav: 'JOG.WAV', altWavs: [] },
              { text: 'jug', ipa: '/dʒʌɡ/', wav: 'JUG.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'collar', ipa: '/ˈkɒlə/', wav: 'COLLAR.WAV', altWavs: [] },
              { text: 'colour', ipa: '/ˈkʌlə/', wav: 'COLOUR.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'wander', ipa: '/ˈwɒndə/', wav: 'WANDER.WAV', altWavs: [] },
              { text: 'wonder', ipa: '/ˈwʌndə/', wav: 'WONDER.WAV', altWavs: [] },
            ],
          },
        ],
      },
      {
        id: 'u10-aa',
        label: '10B: /ɒ/ vs. /ɑː/',
        contrastAudio: 'AANDAA.WAV',
        items: [
          {
            words: [
              { text: 'shock', ipa: '/ʃɒk/', wav: 'SHOCK.WAV', altWavs: [] },
              { text: 'shark', ipa: '/ʃɑːk/', wav: 'SHARK.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'hot', ipa: '/hɒt/', wav: 'HOT.WAV', altWavs: ['HOTB.WAV'] },
              { text: 'heart', ipa: '/hɑːt/', wav: 'HEART.WAV', altWavs: ['HEARTB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'shop', ipa: '/ʃɒp/', wav: 'SHOP.WAV', altWavs: ['SHOPB.WAV'] },
              { text: 'sharp', ipa: '/ʃɑːp/', wav: 'SHARP.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit11',
    number: 11,
    badge: 'Unit 11',
    title: '/əʊ/ vs. /ɔː/',
    subtitle: 'low · law',
    category: 'vowels-back-diphthongs',
    pamType: 'Diphthong Monophthongization',
    restored: false,
    unitAudio: ['UNIT11.WAV', 'OUANDOO.WAV'],
    phonemes: [
      {
        ipa: '/əʊ/',
        label: 'Closing Diphthong (GOAT)',
        audio: 'LOW.WAV',
        frequencyHint: 'Gliding F1/F2 trajectory (central → high-back)',
        articulation: 'Start in relaxed central /ə/ (neutral lips), then glide smoothly to rounded /ʊ/.',
      },
      {
        ipa: '/ɔː/',
        label: 'Long Back Monophthong (THOUGHT)',
        audio: 'LAW.WAV',
        frequencyHint: 'Steady low F2 (~850 Hz) throughout',
        articulation: 'Hold lips rounded and tongue low-back steadily with zero glide.',
      },
    ],
    l1Interference: {
      summary:
        'Greek lacks closing diphthongs starting from a central schwa (/əʊ/). Learners replace both English /əʊ/ ("low, boat") and /ɔː/ ("law, bought") with a static Greek /o/.',
      greekSystem:
        'Greek /o/ is a pure, unchanging monophthong, eliminating the glide cue that separates "low" from "law".',
      englishTarget:
        '/əʊ/ is a dynamic trajectory: unrounded central onset moving into lip-rounded /ʊ/; /ɔː/ is stationary and more open.',
      coachingTip:
        'Watch your lips in a mirror: for "low, boat, loan", your lips start relaxed and gradually pucker at the end. For "law, bought, lawn", round your lips before speaking and hold them still.',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u11-main',
        label: '/əʊ/ vs. /ɔː/ Minimal Pairs',
        contrastAudio: 'OUANDOO.WAV',
        items: [
          {
            words: [
              { text: 'low', ipa: '/ləʊ/', wav: 'LOW.WAV', altWavs: [] },
              { text: 'law', ipa: '/lɔː/', wav: 'LAW.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'Joe', ipa: '/dʒəʊ/', wav: 'JOE.WAV', altWavs: [] },
              { text: 'jaw', ipa: '/dʒɔː/', wav: 'JAW.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'sew', ipa: '/səʊ/', wav: 'SEW.WAV', altWavs: [] },
              { text: 'saw', ipa: '/sɔː/', wav: 'SAW.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'loan', ipa: '/ləʊn/', wav: 'LOAN.WAV', altWavs: [] },
              { text: 'lawn', ipa: '/lɔːn/', wav: 'LAWN.WAV', altWavs: ['LAWNB.WAV'] },
            ],
          },
          {
            words: [
              { text: 'boat', ipa: '/bəʊt/', wav: 'BOAT.WAV', altWavs: [] },
              { text: 'bought', ipa: '/bɔːt/', wav: 'BOUGHT.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit12',
    number: 12,
    badge: 'Unit 12',
    title: '/aʊ/ vs. /əʊ/',
    subtitle: 'now · no',
    category: 'vowels-back-diphthongs',
    pamType: 'Diphthong Onset Discrimination',
    restored: false,
    unitAudio: ['UNIT12.WAV', 'AUANDOU.WAV'],
    phonemes: [
      {
        ipa: '/aʊ/',
        label: 'Wide Open-to-Back Glide (MOUTH)',
        audio: 'NOW.WAV',
        frequencyHint: 'Starts high F1 (~720 Hz), glides to high-back',
        articulation: 'Drop jaw wide open at start (/a/), then glide rapidly up into rounded /ʊ/.',
      },
      {
        ipa: '/əʊ/',
        label: 'Mid-Central-to-Back Glide (GOAT)',
        audio: 'NO.WAV',
        frequencyHint: 'Starts mid F1 (~500 Hz), glides to high-back',
        articulation: 'Begin with a relaxed, half-closed central /ə/ before rounding to /ʊ/.',
      },
    ],
    l1Interference: {
      summary:
        'Greek lacks true /aʊ/ and /əʊ/ diphthongs (Greek αυ is pronounced [af/av]!). Learners often compress the onset height difference or fail to complete the /ʊ/ glide.',
      greekSystem:
        'Greek letter pairs like αυ/ου represent fricative clusters or monophthongs, so starting from central /ə/ vs. wide open /a/ requires explicit jaw-height calibration.',
      englishTarget:
        'Both diphthongs end near /ʊ/, so the entire distinction lies in the opening 40%: wide open jaw for /aʊ/ ("town, now, row [argument]") vs. relaxed mid jaw for /əʊ/ ("tone, no, row [boat]").',
      coachingTip:
        'Notice the heteronym pair "row" (/raʊ/ argument) vs. "row" (/rəʊ/ a boat): drop your jaw generously on the start of "now, town, loud".',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u12-main',
        label: '/aʊ/ vs. /əʊ/ Minimal Pairs',
        contrastAudio: 'AUANDOU.WAV',
        items: [
          {
            words: [
              { text: 'town', ipa: '/taʊn/', wav: 'TOWN.WAV', altWavs: ['TOWNB.WAV'] },
              { text: 'tone', ipa: '/təʊn/', wav: 'TONE.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'now', ipa: '/naʊ/', wav: 'NOW.WAV', altWavs: [] },
              { text: 'no', ipa: '/nəʊ/', wav: 'NO.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'loud', ipa: '/laʊd/', wav: 'LOUD.WAV', altWavs: [] },
              { text: 'load', ipa: '/ləʊd/', wav: 'LOAD.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'found', ipa: '/faʊnd/', wav: 'FOUND.WAV', altWavs: [] },
              { text: 'phoned', ipa: '/fəʊnd/', wav: 'PHONED.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'row (argument)', ipa: '/raʊ/', wav: 'ROWL.WAV', altWavs: [] },
              { text: 'row (a boat)', ipa: '/rəʊ/', wav: 'ROWQ.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'unit13',
    number: 13,
    badge: 'Unit 13 · Restored',
    title: '/ʊ/ vs. /uː/',
    subtitle: 'full · fool',
    category: 'vowels-back-diphthongs',
    pamType: 'Restored 1994 Archive · High-Back Collapse',
    restored: true,
    unitAudio: ['UNIT.WAV', 'UANDUU.WAV'],
    phonemes: [
      {
        ipa: '/ʊ/',
        label: 'Short Lax High-Back Centralized (FOOT)',
        audio: 'U.WAV',
        frequencyHint: 'Higher F1 (~430 Hz), more central F2 (~1150 Hz)',
        articulation: 'Relaxed lips, tongue slightly lowered and forward from full /uː/.',
      },
      {
        ipa: '/uː/',
        label: 'Long Tense High-Back (GOOSE)',
        audio: 'UU.WAV',
        frequencyHint: 'Low F1 (~300 Hz), tight rounded lips',
        articulation: 'High tongue and firmly rounded, protruded lips; longer duration.',
      },
    ],
    l1Interference: {
      summary:
        'Restored from the unlinked 1994 .WAV recordings! Parallel to Unit 8 (/ɪ/ vs. /iː/), Greek has a single high-back vowel /u/ that absorbs both English lax /ʊ/ ("full, pull, look") and tense /uː/ ("fool, pool, Luke").',
      greekSystem:
        'Greek /u/ maps cleanly onto neither English pole without training, causing learners to rely only on vowel length.',
      englishTarget:
        'Just as /ɪ/ shifts slightly toward /ə/, lax /ʊ/ ("full, pull, look") is noticeably less lip-rounded and more central than tense /uː/ ("fool, pool, Luke").',
      coachingTip:
        'Relax your lips completely for "full, pull, look" instead of puckering tightly as in Greek /u/. Keep "fool, pool, Luke" tightly rounded and sustained.',
      spectralMode: 'vowel',
    },
    groups: [
      {
        id: 'u13-main',
        label: '/ʊ/ vs. /uː/ Minimal Pairs (Restored 1994 Recordings)',
        contrastAudio: 'UANDUU.WAV',
        items: [
          {
            words: [
              { text: 'full', ipa: '/fʊl/', wav: 'FULL.WAV', altWavs: [] },
              { text: 'fool', ipa: '/fuːl/', wav: 'FOOL.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'pull', ipa: '/pʊl/', wav: 'PULL.WAV', altWavs: [] },
              { text: 'pool', ipa: '/puːl/', wav: 'POOL.WAV', altWavs: [] },
            ],
          },
          {
            words: [
              { text: 'look', ipa: '/lʊk/', wav: 'LOOK.WAV', altWavs: [] },
              { text: 'Luke', ipa: '/luːk/', wav: 'LUKE.WAV', altWavs: [] },
            ],
          },
        ],
      },
    ],
  },
];

export const UNIT_MAP = new Map(UNITS.map((u) => [u.id, u]));


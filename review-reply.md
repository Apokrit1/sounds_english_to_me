# Reply to the Phonology & Linguistics Content Review — "Sounds English to Me"

Thank you for the careful review. I checked every point against the current code (`data/curriculum.js`, 1,367 lines; `js/app.js`; `js/audio-engine.js`; `index.html`). Each point below is marked **Agree**, **Partly agree** or **Disagree**, with my reasons.

---

## Summary

| # | Review point | Verdict |
|---|---|---|
| 1 | DRESS written `/e/` is an IPA error and should be `/ɛ/` ("10 transcription errors") | **Disagree.** It is the standard British convention. I **agree** it should be documented |
| 2 | "`/e/` is FLEECE" | **Disagree.** This is factually wrong |
| 3 | `/∅/` is a non-standard symbol (Unit 6) | **Partly agree** |
| 4 | Mixing `/…/` and `[…]` is inconsistent | **Disagree** |
| 5 | Typo "Postalaveolar" (line 157) | **Disagree.** The typo is not there |
| 6 | `/ŋk/` is a cluster, not a phoneme (Unit 5) | **Partly agree** |
| 7 | Unit 8: duration IS the standard cue before voiceless consonants | **Disagree** |
| 8 | Greek /a/ is "mid-back" (Unit 9) | **Disagree** |
| 9 | "Greek lacks central vowels" is too strong | **Agree** |
| 10 | Greek has 6 vowels, including /y/ | **Disagree** |
| 11 | PAM-L2 = "Perception of Foreign-accented English, Level 2" | **Disagree** |
| 12 | Unit 10 is in the wrong category | **Partly agree** |
| 13 | `altUnitAudio` is dead data | **Agree.** `contrastAudio` is dead too |
| 14 | Unused `SYSTEM_AUDIO` entries | **Agree** |
| 15 | The idle tip mentions a "speaker icon" that does not exist | **Agree** |
| 16 | The AX label "Play A → X Pair" is wrong ("there is no X") | **Disagree** that it is wrong; **agree** it could be clearer |
| 17 | Logic flaw in the nasal tip's `endsWith('k')` check | **Disagree** |
| 18 | Side remarks (Unit 11 "merged /əʊ/", "Greek schwa [u]", "Trudgill/Kuhl") | **Disagree** |
| 19 | Overall, the minimal pairs, L1 rationale and Record & Compare engine are sound | **Agree.** Thank you |

---

## 1. DRESS written as `/e/` — Disagree: it is not an error. Agree it should be documented

The app writes DRESS as `/e/` (bed `/bed/`, sell `/sel/`, edge `/edʒ/`, ten `/ten/`, men `/men/` …) and SQUARE as `/eə/` (share `/ʃeə/`, chair `/tʃeə/`).

This is **not an error**. It is the long-standing **British EFL / RP phonemic convention**, used by:
- J. C. Wells, *Longman Pronunciation Dictionary*. Wells was at UCL, the department where this app was written in 1994.
- Jones / Roach, *Cambridge English Pronouncing Dictionary*.
- The *Oxford Advanced Learner's* and *Cambridge* learner dictionaries, which are the ones Greek learners of English actually use.

All of these give *bed* as `/bed/`. Switching to `/ɛ/` would make the app **disagree with the learners' own dictionaries**. It would also clash with the SQUARE diphthong `/eə/` that the app already uses. Slash notation is broad and works within one system: here `/e/` means "the DRESS phoneme", not cardinal [e].

So the "10 IPA transcription errors" in §5 are not errors, and I will **not** change them to `/ɛ/`.

I do **agree** that a learner trained in narrow IPA could be confused. **Proposed fix:** add one sentence to the *L1 Interference Theory* dialog and the README: *"Transcriptions follow the British dictionary convention (Wells LPD, Cambridge EPD): /e/ = DRESS (bed), /eə/ = SQUARE (chair)."*

## 2. "`/e/` is FLEECE" — Disagree

FLEECE is `/iː/` (sheep `/ʃiːp/`), and the app uses it correctly throughout Units 1, 4 and 8. Cardinal [e] is a close-mid front vowel. It does not stand for FLEECE in any convention.

## 3. `/∅/` for "no final vowel" (Unit 6) — Partly agree

`∅` is not an IPA segment symbol. It is the linguist's "zero/null" sign. I use it here as a teaching shorthand for "no final vowel" (date vs. data), and learners understand it. Still, it should not sit inside phoneme slashes as if it were a phoneme. **Proposed fix:** change the title to "No final vowel vs. final /ə/ (date · data)", and change the chip to `∅ (no vowel)` without slashes.

## 4. Mixing `/…/` and `[…]` — Disagree

This is deliberate and standard practice. Slashes mark **phonemes**; square brackets mark **phonetic realisations (allophones)**. Unit 0 writes the phoneme as `/t/` and its aspirated allophone as `[tʰ]`. Unit 1 contrasts the English phoneme `/s/` with the Greek realisation `[s̠]`. Using one notation for both would erase the phoneme–allophone distinction that these units teach.

## 5. Typo "Postalaveolar" (line 157) — Disagree: the typo is not there

Line 157 reads `label: 'Rounded Postalveolar Fricative'`. Every occurrence of "postalveolar" in the file is spelled correctly (lines 157, 165, 246, 249, 317, 324 and 400–417).

## 6. `/ŋk/` is a cluster, not a phoneme (Unit 5) — Partly agree

It is true that `/ŋk/` is a sequence, /ŋ/ + /k/. The app's label already says so: "Velar Nasal + Voiceless Velar Stop". Putting a sequence between slashes is ordinary phonemic notation (compare `/sɪŋk/`), so it is not an error. The unit's point is that for Greek speakers [ŋ] only occurs *before* a velar stop. The contrast being trained is therefore "[ŋ] alone vs. [ŋ] + stop". **Proposed fix (optional):** retitle the unit "/ŋ/ vs. /ŋ/ + /k/" so this is completely clear.

## 7. Unit 8: "duration IS the standard cue before voiceless consonants" — Disagree

The reverse is true. **Pre-fortis clipping** shortens vowels before voiceless consonants. As a result, *beat* [biˑt] can be as short as *bid* [bɪːd], or shorter. That is why duration is an unreliable cue in this position, and native listeners rely mainly on **vowel quality** (F1/F2). Greek learners over-rely on duration because Greek has no tense/lax quality contrast. This is the cue-weighting problem the unit targets (Escudero's L2LP model). The app's text is correct as it stands.

## 8. Greek /a/ is "mid-back" (Unit 9) — Disagree

Standard Modern Greek /a/ is an **open central** vowel (Arvaniti 1999, *JIPA* "Illustration of the IPA: Standard Modern Greek"). It is neither mid nor back. Its central position is exactly why English /æ/, /ʌ/ and /ɑː/ all collapse into it. The review also contradicts itself: in the Unit 7 section it describes Greek /a/ as "centrally placed".

## 9. "Greek lacks central vowels (/ɜː, ə, ʌ/)" — Agree

Greek /a/ is open central, so the claim is too strong as written. **Proposed fix:** "Greek has no **mid**-central vowels (/ɜː, ə/) and no /ʌ/; its only central vowel is open /a/." This also makes Units 7 and 9 more precise.

## 10. "Greek has 6 vowel qualities including /y/" — Disagree

Standard Modern Greek has **five** vowels: /i, e, a, o, u/ (Arvaniti 1999). Ancient /y/ (written υ, οι) merged with /i/ during the Byzantine period, about a thousand years ago. The phrase "symmetrical 5-vowel system" (index.html line 73) is correct and will stay.

## 11. PAM-L2 = "Perception of Foreign-accented English, Level 2" — Disagree

PAM-L2 is the **Perceptual Assimilation Model for second-language speech learning** (Best & Tyler, 2007), an extension of Best's original PAM (1995). The `pamType` labels use its assimilation types: Single-Category, Category-Goodness and Two-Category. The model has nothing to do with Trudgill.

## 12. Unit 10 in the wrong category — Partly agree

The category is "Vowels & Diphthongs: Back Contrasts & Glides". Unit 10 contrasts the back vowels /ɒ/ and /ɑː/ with /ʌ/, so it does fall under "back contrasts". The category is meant to hold back monophthongs *and* diphthongs, not only diphthongs. I agree the title could be clearer. **Proposed fix:** rename it "Back Vowels & Diphthongs". No units move.

## 13. `altUnitAudio` is dead data — Agree, and `contrastAudio` is dead too

Confirmed: `js/app.js` never reads `altUnitAudio` (Units 3, 7, 9, 10). The review missed a second case: the per-group `contrastAudio` field (e.g. `3ANDE.WAV`, `AEANDV.WAV`) is **never read either**. Both are original 1994 recordings that announce each sub-contrast, so I would rather **use** them than delete them. **Proposed fix:** play `contrastAudio` when a sub-group pill is selected in Explore mode, and play `altUnitAudio` after `unitAudio` when "▶ Unit Audio" is pressed.

## 14. Unused `SYSTEM_AUDIO` entries — Agree

`welcome`, `intro`, `example`, `unit`, `and`, `p` and `likeThat` are no longer referenced. Welcome and intro were taken out of the UI at my request. **Proposed fix:** remove these keys from `SYSTEM_AUDIO`. The .WAV files stay in the repository as part of the 1994 archive.

## 15. Idle tip mentions a "speaker icon" — Agree

`js/app.js` line 233 tells users to "click the speaker icon on any Unit card", but the button is actually labelled "▶ Preview". **Proposed fix:** change the text to "click ▶ Preview on any Unit card".

## 16. AX label "Play A → X Pair" — Disagree that it is wrong, agree it could be clearer

"AX" is the standard name of this discrimination paradigm: the listener hears stimulus A, then stimulus X, and decides whether X is the same as A. "A → X" is therefore the correct term; "A → B" would not be. Learners, though, are better served by plain words. **Proposed fix:** relabel the button "▶ Play the two words".

## 17. The nasal tip's `endsWith('k')` check — Disagree

The review misreads what the code is for. The tip is **supposed** to fire for *sing, bang, rang, hung* and *thing*, the words that should end in a pure [ŋ]. If a Greek learner adds an extra [k]/[ɡ] (the Unit 5 error), the release burst raises the high-frequency energy, and the tip flags it. Words that really do end in /k/ (*sink, bank, think*) are excluded by `!endsWith('k')`. That is the intended behaviour. One fair caveat: spectral centroid is only a coarse detector of a release burst. That is why the tip says the energy "suggests" a release rather than claiming one was "detected".

## 18. Side remarks — Disagree

- Unit 11, "Greek merged /əʊ/ to /o/": Greek never had /əʊ/. Greek /o/ is a monophthong, and learners map English /əʊ/ onto it. The app's text already says this.
- Unit 7, "some sources have Greek schwa [u] allophones": this is not true of Standard Modern Greek. Northern Greek varieties raise and delete unstressed vowels, but they have no schwa.
- §4, "Unit 10: Greek /o/ is mid-back… English /ʒ/? no; fine": this note is unfinished, so there is nothing to act on.

## 19. Strengths — Agree

Thank you for noting the quality of the minimal-pair selection, the triplet design, the L1-interference rationale and the Record & Compare engine.

---

## Proposed changes (awaiting approval; none applied yet)

1. Document the British convention (/e/ = DRESS, /eə/ = SQUARE) in the theory dialog and README. **No changes to `/ɛ/`.**
2. Unit 6: replace `/∅/` with "no final vowel". Optionally retitle Unit 5 "/ŋ/ vs. /ŋ/ + /k/".
3. Reword "Greek lacks central vowels" to "no mid-central vowels (/ɜː, ə/) and no /ʌ/; only open central /a/".
4. Rename the category "Back Vowels & Diphthongs".
5. Wire up the unused 1994 `contrastAudio` and `altUnitAudio` recordings, and remove the unused `SYSTEM_AUDIO` keys.
6. Fix the idle-tip wording ("▶ Preview") and the AX button label ("▶ Play the two words").

### References
- Arvaniti, A. (1999). Standard Modern Greek. *Journal of the International Phonetic Association*, 29(2), 167–172.
- Best, C. T., & Tyler, M. D. (2007). Nonnative and second-language speech perception: Commonalities and complementarities. In O.-S. Bohn & M. J. Munro (Eds.), *Language Experience in Second Language Speech Learning*.
- Escudero, P. (2005). *Linguistic Perception and Second Language Acquisition* (the L2LP model).
- Flege, J. E., & Bohn, O.-S. (2021). The revised Speech Learning Model (SLM-r).
- Wells, J. C. *Longman Pronunciation Dictionary*; Jones, D. / Roach, P. *Cambridge English Pronouncing Dictionary*.

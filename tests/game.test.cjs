const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createSourceLoader } = require('./source-loader.cjs');
const load = createSourceLoader();
const { createSession, sessionReducer, totalScore } = load('src/engine/session.ts');
const { validateWordSubmission, getBrasiliaDateKey, normalizeWord } = load('src/engine/prng.ts');
const { parseLexicon } = load('src/engine/lexicon.ts');
const { WORDBOMB_SYLLABLES } = load('src/data/syllables.ts');
const { buildDeck, LEARNING_BANK } = load('src/engine/deck.ts');
const { MISSIONS } = load('src/data/missions.ts');
const { sanitizeProfile } = load('src/engine/storage.ts');
const dictionary = parseLexicon(fs.readFileSync('public/lexicon/pt-BR.txt', 'utf8'));
const start = (mode, extra = {}) => createSession({ id: 'test', mode, category: 'mixed', seed: 2026, relaxed: false, ...extra });
const plain = value => JSON.parse(JSON.stringify(value));

test('corpus is sorted for binary search and common words are accepted', () => {
  const words = fs.readFileSync('public/lexicon/pt-BR.txt', 'utf8').trim().split('\n');
  assert.ok(dictionary.size > 300000);
  let previous = '';
  for (const word of words) { const key = normalizeWord(word); assert.ok(key >= previous, `Out of order: ${word}`); previous = key; }
  for (const word of ['computador', 'flores', 'corações', 'mulheres', 'compreender', 'carneiro', 'pães']) assert.equal(validateWordSubmission(word, '', new Set(), dictionary).valid, true, word);
  for (const word of ['amors', 'computadors', 'professorndo', 'c@a1sa', 'casa azul', 'caralho']) assert.equal(validateWordSubmission(word, '', new Set(), dictionary).valid, false, word);
  assert.equal(validateWordSubmission('computador', 'COM', new Set(['COMPUTADOR']), dictionary).valid, false);
});

test('every displayed example obeys the same game validator', () => {
  for (const item of WORDBOMB_SYLLABLES) {
    assert.ok(item.samples.length >= 3);
    for (const word of item.samples) assert.equal(validateWordSubmission(word, item.syl, new Set(), dictionary).valid, true, `${item.syl}: ${word}`);
    assert.equal(item.hint, item.samples.slice(0, 3).join(' • '));
  }
});

for (const mode of ['wordbomb', 'classic', 'daily', 'elevator']) test(`${mode}: clock continues after consecutive timeouts`, () => {
  let session = start(mode);
  for (let round = 0; round < 2; round++) {
    session = sessionReducer(session, { type: 'TICK', elapsed: 14001 });
    assert.equal(session.phase, 'feedback'); assert.equal(session.history.length, round + 1);
    session = sessionReducer(session, { type: 'NEXT' }); assert.equal(session.phase, 'answering');
    const before = session.fuseMs;
    session = sessionReducer(session, { type: 'TICK', elapsed: 100 }); assert.ok(session.fuseMs < before);
  }
});

test('pause protects both clocks and resumes the actual prior phase', () => {
  let session = start('classic');
  session = sessionReducer(session, { type: 'PAUSE' });
  assert.equal(sessionReducer(session, { type: 'TICK', elapsed: 100000 }), session);
  assert.equal(sessionReducer(session, { type: 'ANSWER', option: 1 }), session);
  session = sessionReducer(session, { type: 'RESUME' }); assert.equal(session.phase, 'answering');
  session = sessionReducer(session, { type: 'ANSWER', option: 1 });
  session = sessionReducer(session, { type: 'PAUSE' });
  session = sessionReducer(session, { type: 'RESUME' }); assert.equal(session.phase, 'feedback');
});

test('double answers and actions after finish do not change scores', () => {
  let session = start('classic');
  session = sessionReducer(session, { type: 'ANSWER', option: session.queue[0].correctIndex });
  assert.equal(sessionReducer(session, { type: 'ANSWER', option: 0 }), session);
  session = sessionReducer(session, { type: 'NEXT' });
  const combo = session.streak;
  session = sessionReducer(session, { type: 'BANK' }); assert.equal(session.streak, combo); assert.ok(session.safeScore > 0);
  const safe = session.safeScore;
  session = sessionReducer(session, { type: 'BANK' }); assert.equal(session.safeScore, safe);
  session = sessionReducer(session, { type: 'FINISH' });
  assert.equal(sessionReducer(session, { type: 'NEXT' }), session);
  assert.equal(sessionReducer(session, { type: 'TICK', elapsed: 5000 }), session);
  assert.equal(totalScore(session), safe);
});

test('word submission keeps accents, prevents repeat, and respects selected sequence', () => {
  let session = start('wordbomb', { forcedSyllable: 'COM', relaxed: true });
  assert.equal(session.syllables[0].syl, 'COM');
  session = sessionReducer(session, { type: 'WORD', raw: 'computador', dictionary });
  assert.equal(session.phase, 'feedback'); assert.equal(session.history[0].isCorrect, true);
  assert.equal(sessionReducer(session, { type: 'WORD', raw: 'computador', dictionary }), session);
});

test('all quiz decks keep category and never repeat a prompt in a session', () => {
  for (const category of ['mixed', 'logic', 'words', 'general', 'math']) for (let seed = 0; seed < 20; seed++) {
    const deck = buildDeck(category, seed);
    assert.ok(deck.length > 0); assert.equal(new Set(deck.map(q => q.prompt)).size, deck.length);
    assert.ok(deck.every(q => category === 'mixed' || q.category === category));
    assert.ok(deck.every(q => new Set(q.options).size === 4 && q.options[q.correctIndex] !== undefined));
  }
});

test('recent questions are deprioritized, and daily content ignores performance/history', () => {
  const deck = buildDeck('logic', 10), recent = deck.slice(0, 8).map(q => q.id);
  assert.ok(!recent.includes(buildDeck('logic', 10, recent)[0].id));
  const first = start('daily', { seed: 1, dateKey: '2026-10-20', recent });
  const second = start('daily', { seed: 999, dateKey: '2026-10-20', recent: [] });
  assert.equal(first.queue.length, 10); assert.deepEqual(plain(first.queue), plain(second.queue));
  const wrong = sessionReducer(first, { type: 'ANSWER', option: (first.queue[0].correctIndex + 1) % 4 });
  assert.deepEqual(plain(sessionReducer(wrong, { type: 'NEXT' }).queue), plain(second.queue));
});

test('arcade mixed decks balance themes and skip long mission scenarios', () => {
  for (let seed = 0; seed < 20; seed++) {
    const deck = buildDeck('mixed', seed);
    assert.ok(deck.every(question => !question.context && !question.transfer));
    for (let index = 0; index < 28; index += 4) assert.equal(new Set(deck.slice(index, index + 4).map(question => question.category)).size, 4);
  }
  assert.equal(sanitizeProfile(null).relaxedMode, false);
  assert.equal(sanitizeProfile(null).autoAdvance, true);
  assert.equal(sanitizeProfile({ autoAdvance: false, relaxedMode: true }).autoAdvance, false);
  assert.equal(sanitizeProfile({ autoAdvance: false, relaxedMode: true }).relaxedMode, true);
});

test('missions finish at eight decisions and include two transfer checks', () => {
  for (const mission of MISSIONS) {
    assert.equal(mission.questions.length, 8); assert.equal(mission.questions.filter(q => q.transfer).length, 2);
    let session = start('mission', { missionId: mission.id }); assert.equal(session.relaxed, true);
    for (const question of session.queue) {
      assert.equal(new Set(question.options).size, 4); assert.ok(question.explanation.length > 20);
      session = sessionReducer(session, { type: 'ANSWER', option: question.correctIndex });
      session = sessionReducer(session, { type: 'NEXT' });
    }
    assert.equal(session.phase, 'finished'); assert.equal(session.history.filter(h => h.isCorrect).length, 8);
  }
  assert.equal(new Set(LEARNING_BANK.map(q => q.id)).size, LEARNING_BANK.length);
});

test('profiles migrate safely and malformed persisted data cannot crash review', () => {
  const profile = sanitizeProfile({ version: 10, matchesPlayed: 0, careerXP: 520, sfxVolume: 999, avatarBg: 'zzzzzz', totalQuestionsCorrect: 999, totalQuestionsAnswered: 2, dailyHistory: { bad: {} }, reviewHistory: [{ prompt: 'test', isCorrect: false, question: { options: null } }] });
  assert.equal(profile.version, 12); assert.equal(profile.careerXP, 0); assert.equal(profile.sfxVolume, 100);
  assert.equal(profile.avatarBg, '0f172a'); assert.equal(profile.totalQuestionsCorrect, 2);
  assert.equal(profile.reviewHistory[0].question, undefined); assert.deepEqual(plain(profile.dailyHistory), {});
  const denied = createSourceLoader({ localStorage: { setItem() { throw new Error('quota'); }, getItem() { throw new Error('denied'); } } })('src/engine/storage.ts');
  assert.equal(denied.saveProfile(profile), false); assert.equal(denied.loadProfile().version, 12);
});

test('Brasilia date handles UTC midnight and date boundaries', () => {
  assert.equal(getBrasiliaDateKey(new Date('2026-10-20T02:59:59Z')), '2026-10-19');
  assert.equal(getBrasiliaDateKey(new Date('2026-10-20T03:00:00Z')), '2026-10-20');
});


const { importCrosswordBank, crosswordComplete, writeEntry } = load('src/engine/crossword.ts');
const { ECHO_LEVELS, echoStep, echoSolved } = load('src/engine/echo.ts');
const { rewardDiscovery, acquireCharacter, equipCharacter } = load('src/engine/collection.ts');
const { CHARACTERS } = load('src/data/characters.ts');

test('words always have time even when old profile requests relaxed mode', () => {
  const session = start('wordbomb', { relaxed: true });
  assert.equal(session.relaxed, false);
  assert.ok(sessionReducer(session, { type: 'TICK', elapsed: 1000 }).remainingMs < session.remainingMs);
});

test('all imported crossword editions preserve source answers, crossings, clues and three levels', () => {
  const raw = JSON.parse(fs.readFileSync('public/crosswords/upstream.json', 'utf8').replace(/^\uFEFF/, ''));
  const bank = importCrosswordBank(raw);
  assert.equal(bank.length, 20);
  assert.equal(bank.reduce((count, puzzle) => count + puzzle.entries.length, 0), 160);
  assert.equal(new Set(bank.map(puzzle => puzzle.difficulty)).size, 3);
  for (const puzzle of bank) {
    let values = {};
    assert.equal(crosswordComplete(puzzle, values), false);
    for (const entry of puzzle.entries) {
      assert.ok(!puzzle.solution[entry.clueCell]);
      assert.equal(puzzle.clues[entry.clueCell].includes(entry.id), true);
      values = writeEntry(puzzle, values, entry, 0, entry.answer.toLowerCase());
    }
    assert.equal(crosswordComplete(puzzle, values), true);
  }
  const malformed = JSON.parse(JSON.stringify(raw)); malformed[0].words[0].word = 'INVALIDA';
  assert.throws(() => importCrosswordBank(malformed), /Resposta/);
});

test('every echo puzzle is reachable and consequences depend on order', () => {
  for (const level of ECHO_LEVELS) {
    let state = { values: level.start, pending: null, moves: 0 };
    assert.equal(echoSolved(state, level.target), false);
    for (const choice of level.solution) state = echoStep(state, choice);
    assert.equal(echoSolved(state, level.target), true);
    assert.ok(state.moves <= level.limit);
  }
  const initial = { values: [0, 0, 0], pending: null, moves: 0 };
  assert.notDeepEqual(plain(echoStep(echoStep(initial, 0), 1).values), plain(echoStep(echoStep(initial, 1), 0).values));
});

test('collection purchase is atomic, owns before equipping, and rewards only new discoveries', () => {
  let profile = sanitizeProfile(null);
  assert.equal(profile.sfxVolume, 50);
  assert.equal(profile.fragments, 12);
  assert.equal(profile.equippedCharacter, 'kael');
  assert.equal(equipCharacter(profile, 'leo'), profile);
  assert.equal(acquireCharacter(profile, 'leo'), profile);
  profile = rewardDiscovery(profile, 'echo-1', 8);
  assert.equal(profile.fragments, 20);
  assert.equal(rewardDiscovery(profile, 'echo-1', 8), profile);
  profile = acquireCharacter(profile, 'leo');
  assert.equal(profile.fragments, 2);
  assert.equal(acquireCharacter(profile, 'leo'), profile);
  profile = equipCharacter(profile, 'leo');
  assert.equal(profile.equippedCharacter, 'leo');
  assert.equal(sanitizeProfile(profile).equippedCharacter, 'leo');
  assert.ok(CHARACTERS.every(character => ['lorelei', 'avataaars', 'pixel-art'].includes(character.style)));
  const legacy = sanitizeProfile({ version: 11, avatarStyle: 'pixel-art', avatarSeed: 'CyberNinja', sfxVolume: 0 });
  assert.equal(legacy.equippedCharacter, 'shinobi');
  assert.equal(legacy.ownedCharacters.length, 6);
  assert.equal(legacy.sfxVolume, 0);
  assert.equal(sanitizeProfile({ version: 11, sfxVolume: 25 }).sfxVolume, 50);
});

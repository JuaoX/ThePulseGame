const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PULSE_PLAYWRIGHT || 'playwright');
const { createSourceLoader } = require('./source-loader.cjs');
const load = createSourceLoader();
const { LEARNING_BANK } = load('src/engine/deck.ts');
const { WORDBOMB_SYLLABLES } = load('src/data/syllables.ts');
const baseURL = process.env.PULSE_BASE_URL || 'http://127.0.0.1:5180/';
const out = '.impeccable/review';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const executable = process.env.PULSE_CHROMIUM || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(executable ? { executablePath: executable } : {}) });
  const results = [], errors = [];
  async function context(width = 390) {
    const context = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 1000 }, hasTouch: width < 800, isMobile: width < 800, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL);
    await page.evaluate(() => document.fonts.ready);
    return { context, page };
  }
  async function capture(page, filename) {
    const scroll = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${filename}.png`, fullPage: true });
    await page.evaluate(y => window.scrollTo(0, y), scroll);
  }
  async function layout(page, width) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 43 || r.width < 43); }).map(b => b.textContent));
    assert.deepEqual(small, [], `Small controls at ${width}`);
  }
  async function leave(page) {
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await page.getByRole('button', { name: 'Sair da partida', exact: true }).click();
  }
  async function stored(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile'))); }
  async function manual(page) {
    await page.getByRole('button', { name: 'Configurações', exact: true }).click();
    await page.getByLabel('Avançar respostas automaticamente', { exact: true }).uncheck();
    await page.keyboard.press('Escape');
  }
  try {
    for (const width of [320, 375, 390, 768, 1440]) {
      const { context: ctx, page } = await context(width);
      assert.equal(await page.locator('.game-tile').count(), 6);
      const visible = await page.locator('body').innerText();
      assert.ok(visible.split(/\s+/).length < 110, 'Game selection has too much text');
      assert.ok(!/DiceBear|GitHub|MagicUI|React Bits|licenças|autoria|missões|caderno/i.test(visible));
      await layout(page, width);
      await capture(page, `arcade-${width}`);
      await page.getByRole('button', { name: 'Abrir O Elevador', exact: true }).click();
      await layout(page, width);
      await capture(page, `arcade-game-${width}`);
      await page.locator('.answer-option').first().click();
      await page.getByRole('button', { name: 'Por quê?', exact: true }).click();
      const prompt = await page.locator('.question-panel h2').innerText();
      await page.waitForTimeout(2400);
      assert.equal(await page.locator('.question-panel h2').innerText(), prompt, 'Explanation did not hold auto-advance');
      assert.equal(await page.getByRole('button', { name: 'Por quê?', exact: true }).getAttribute('aria-expanded'), 'true');
      await capture(page, `arcade-feedback-${width}`);
      await page.getByRole('button', { name: 'Pausar', exact: true }).click();
      await page.getByRole('dialog', { name: 'Pausa', exact: true }).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Próxima', exact: true }).click();
      await page.waitForFunction(() => document.activeElement === document.querySelector('.question-panel h2'));
      assert.notEqual(await page.locator('.question-panel h2').innerText(), prompt);
      results.push(`responsive selector, game, optional explanation, pause and focus: ${width}`);
      await ctx.close();
    }
    {
      const { context: ctx, page } = await context();
      await page.getByRole('button', { name: 'Abrir Arena Pulse', exact: true }).click();
      const prompt = await page.locator('.question-panel h2').innerText();
      await page.locator('.answer-option').first().click();
      await page.waitForFunction(previous => document.querySelector('.question-panel h2')?.textContent !== previous, prompt);
      await leave(page);
      await page.getByRole('button', { name: 'Abrir Desafio do dia', exact: true }).click();
      await page.locator('.answer-option').first().click();
      await page.getByRole('button', { name: 'Como funciona', exact: true }).click();
      const dailyPrompt = await page.locator('.question-panel h2').innerText();
      await page.waitForTimeout(2600);
      assert.equal(await page.locator('.question-panel h2').innerText(), dailyPrompt, 'Help did not pause auto-advance');
      await page.keyboard.press('Escape');
      await page.waitForFunction(previous => document.querySelector('.question-panel h2')?.textContent !== previous, dailyPrompt);
      results.push('automatic next round; opening help suspends feedback and resumes safely');
      await ctx.close();
    }
    {
      const { context: ctx, page } = await context();
      await ctx.route('https://**/*', route => route.abort());
      await page.getByRole('button', { name: 'Configurações', exact: true }).click();
      await page.getByText('Conferir uma palavra', { exact: true }).click();
      await page.getByLabel('Palavra', { exact: true }).fill('computador');
      await page.getByText('“computador” vale!', { exact: true }).waitFor();
      await page.getByLabel('Palavra', { exact: true }).fill('amors');
      await page.getByText(/Ainda não encontramos/).waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Abrir Bomba de palavras', exact: true }).click();
      const sequence = await page.locator('.sequence-display').innerText();
      const sample = WORDBOMB_SYLLABLES.find(item => item.syl === sequence).samples[0];
      const input = page.getByLabel('Sua palavra', { exact: true });
      assert.equal(await input.getAttribute('aria-describedby'), 'word-instruction');
      assert.equal(await page.locator('#word-instruction').getAttribute('aria-live'), 'polite');
      assert.ok((await page.locator('#word-instruction').textContent()).includes(sequence));
      await input.fill(sample); await input.press('Enter');
      assert.equal(await input.isDisabled(), false, 'Word field disabled between rounds, dismissing mobile keyboard');
      assert.equal(await input.evaluate(el => document.activeElement === el), true);
      await page.waitForFunction(() => document.querySelector('.question-meta')?.textContent.includes('Palavra 2'));
      assert.equal(await input.inputValue(), '');
      assert.ok((await page.locator('#word-instruction').textContent()).includes(await page.locator('.sequence-display').innerText()));
      await capture(page, 'arcade-word-mobile');
      await leave(page);
      await page.locator('.bottom-nav').getByRole('button', { name: 'Coleção', exact: true }).click();
      const pictures = page.locator('.character-card img');
      assert.equal(await pictures.count(), 9);
      for (const img of await pictures.all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(image => image.decode()); }
      assert.ok(!/DiceBear|licenças|autoria/i.test(await page.locator('body').innerText()));
      await page.getByRole('button', { name: 'Ver Luna', exact: true }).click(); await page.getByRole('button', { name: 'Usar personagem', exact: true }).click();
      await page.reload();
      assert.equal(await page.locator('.profile-button img').getAttribute('src'), '/avatars/lor_luna.svg');
      await page.getByRole('button', { name: 'Configurações', exact: true }).click();
      await page.getByLabel(/^Volume/).press('Home'); await page.keyboard.press('Escape'); await page.reload();
      assert.equal(await page.getByRole('button', { name: 'Ativar sons', exact: true }).count(), 1);
      results.push('dictionary consistency; word input keeps focus; local avatars, no visible credits, persisted mute');
      await ctx.close();
    }
    {
      const { context: ctx, page } = await context();
      await ctx.route('**/lexicon/pt-BR*', route => route.abort());
      await page.getByRole('button', { name: 'Abrir Bomba de palavras', exact: true }).click();
      await page.getByText('As palavras não carregaram. Tente novamente.', { exact: true }).waitFor();
      await ctx.unroute('**/lexicon/pt-BR*');
      await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
      await page.getByLabel('Sua palavra', { exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('.question-meta')?.textContent.includes('Palavra 2'), null, { timeout: 20000 });
      const before = await page.locator('.question-meta').innerText();
      await page.waitForTimeout(1200);
      assert.notEqual(await page.locator('.question-meta').innerText(), before, 'Clock frozen after timeout');
      await page.getByRole('button', { name: 'Pausar', exact: true }).click();
      const clock = await page.locator('.clock').innerText();
      await page.waitForTimeout(1200); assert.equal(await page.locator('.clock').innerText(), clock);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Voltar', exact: true }).focus(); await page.keyboard.press('Tab');
      assert.notEqual(await page.evaluate(() => document.activeElement.textContent), 'Sair');
      results.push('dictionary failure/retry; real timeout auto-advances and timer continues; pause; Tab');
      await ctx.close();
    }
    {
      const { context: ctx, page } = await context();
      await manual(page);
      await page.getByRole('button', { name: 'Abrir Desafio do dia', exact: true }).click();
      async function complete(wrong) {
        for (let i = 0; i < 10; i++) {
          const prompt = await page.locator('.question-panel h2').innerText();
          const question = LEARNING_BANK.find(q => q.prompt === prompt); assert.ok(question);
          const option = wrong ? (question.correctIndex + 1) % 4 : question.correctIndex;
          const labels = await page.locator('.answer-option > span:nth-child(2)').allTextContents();
          await page.locator('.answer-option').nth(labels.indexOf(question.options[option])).click();
          await page.getByRole('button', { name: i === 9 ? 'Resultado' : 'Próxima', exact: true }).click();
        }
        await page.locator('.result-score').waitFor();
      }
      await complete(false);
      const first = await stored(page);
      assert.equal(Object.values(first.dailyHistory)[0].correctCount, 10);
      assert.equal(await page.locator('.result-details').getAttribute('open'), null);
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('permission denied')) } }));
      await page.getByRole('button', { name: 'Copiar resultado', exact: true }).click();
      assert.ok((await page.getByLabel('Selecione e copie seu resultado').inputValue()).includes('10/10 acertos'));
      await capture(page, 'arcade-result-mobile');
      await page.getByRole('button', { name: 'Repetir', exact: true }).click();
      await complete(true);
      const replay = await stored(page);
      assert.equal(Object.values(replay.dailyHistory)[0].correctCount, 10); assert.equal(replay.careerXP, first.careerXP);
      await page.getByRole('button', { name: 'Explorar', exact: true }).click();
      await page.locator('.bottom-nav').getByRole('button', { name: 'Recordes', exact: true }).click();
      await page.getByRole('heading', { name: 'Seus recordes', exact: true }).waitFor();
      results.push('manual preference, full daily, compact result, copy recovery, first score retained on replay, records');
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    const report = { pass: true, browser: 'Chromium desktop and touch emulation; no physical device', cases: results, pageErrors: errors };
    fs.writeFileSync(`${out}/browser-results.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });


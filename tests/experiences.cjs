const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createSourceLoader } = require('./source-loader.cjs');
const load = createSourceLoader();
const { importCrosswordBank } = load('src/engine/crossword.ts');
const { ECHO_LEVELS } = load('src/engine/echo.ts');
const bank = importCrosswordBank(JSON.parse(fs.readFileSync('public/crosswords/upstream.json', 'utf8').replace(/^\uFEFF/, '')));
const out = '.impeccable/review';
const url = process.env.PULSE_BASE_URL || 'http://127.0.0.1:5180/';

(async () => {
  const executable = process.env.PULSE_CHROMIUM || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(executable ? { executablePath: executable } : {}) });
  const cases = [], errors = [];
  const capture = async (page, file) => { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${out}/${file}.png`, fullPage: true }); };
  const profile = page => page.evaluate(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile')));
  async function paste(page, key, answer) {
    await page.locator(`[id="cross-${key}"]`).evaluate((input, text) => {
      const data = new DataTransfer(); data.setData('text/plain', text);
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, answer);
  }
  async function choose(page, puzzle) {
    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await page.getByRole('button', { name: 'Abrir Cruzadas Diretas', exact: true }).click();
    await page.getByRole('button', { name: puzzle.title, exact: true }).click();
    await page.getByRole('button', { name: 'Abrir cruzada', exact: true }).click();
  }
  async function solve(page, puzzle) {
    for (const entry of puzzle.entries) {
      const button = page.getByRole('button', { name: `Pista: ${entry.clue}, ${entry.direction === 'H' ? 'horizontal' : 'vertical'}`, exact: true });
      if (await button.count()) await button.click();
      else { await page.locator(`[id="cross-${entry.cells[0]}"]`).focus(); }
      await paste(page, entry.cells[0], entry.answer);
    }
    await page.getByRole('button', { name: 'Concluir', exact: true }).click();
    await page.getByText('Cruzada completa!', { exact: false }).waitFor();
  }
  try {
    for (const width of [320, 390, 768, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: width > 800 ? 1000 : 844 }, hasTouch: width < 800, isMobile: width < 800, reducedMotion: 'reduce' });
      const page = await ctx.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(url); await page.evaluate(() => document.fonts.ready);
      await capture(page, `experiences-home-${width}`);
      assert.ok(!/\bjogar\b|\bjogos\b|\bjogo\b|DiceBear|GitHub|licenças/i.test(await page.locator('body').innerText()));
      assert.equal((await profile(page)).sfxVolume, 50);
      await page.getByRole('button', { name: 'Abrir Ecos', exact: true }).click();
      await page.getByLabel('Sinal', { exact: true }).waitFor();
      await capture(page, `experiences-echo-${width}`);
      for (const signal of ECHO_LEVELS[0].solution) await page.getByRole('button', { name: new RegExp(`^Sinal ${'ABC'[signal]}:`) }).click();
      await page.getByText('Em sintonia!', { exact: true }).waitFor();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile')).fragments === 20);
      await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
      for (const signal of ECHO_LEVELS[0].solution) await page.getByRole('button', { name: new RegExp(`^Sinal ${'ABC'[signal]}:`) }).click();
      assert.equal((await profile(page)).fragments, 20);
      await page.getByRole('button', { name: 'Voltar', exact: true }).click();
      const nav = page.locator(width > 760 ? '.desktop-nav' : '.bottom-nav');
      await nav.getByRole('button', { name: 'Coleção', exact: true }).click();
      await page.getByRole('button', { name: 'Ver Leo', exact: true }).click();
      await page.getByRole('button', { name: 'Adquirir e usar', exact: false }).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile')).equippedCharacter === 'leo');
      assert.equal((await profile(page)).fragments, 2);
      assert.equal(await page.locator('.character-card').count(), 9);
      await page.getByRole('button', { name: 'Ver Luna · Aurora', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: /Adquirir e usar/ }).isDisabled(), true);
      assert.equal(await page.locator('.character-showcase .portrait-orbit').evaluate(el => getComputedStyle(el).animationName), 'none');
      await capture(page, `experiences-collection-${width}`);
      await page.reload();
      assert.equal((await profile(page)).equippedCharacter, 'leo');
      assert.equal(await page.locator('.profile-button img').getAttribute('src'), '/avatars/ava_leo.svg');
      await page.getByRole('button', { name: 'Abrir Cruzadas Diretas', exact: true }).click();
      await page.getByRole('button', { name: 'Abrir cruzada', exact: true }).click();
      await page.locator('.cross-grid').waitFor();
      await capture(page, `experiences-crossword-${width}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Crossword overflow at ${width}`);
      const first = bank[0].entries[0];
      const firstInput = page.locator(`[id="cross-${first.cells[0]}"]`);
      await firstInput.focus();
      await firstInput.evaluate((input, letter) => { input.value = letter; input.dispatchEvent(new InputEvent('input', { data: letter, inputType: 'insertText', bubbles: true })); }, first.answer[0]);
      await page.waitForFunction(id => document.activeElement.id === id, `cross-${first.cells[1]}`);
      await firstInput.focus(); await page.keyboard.type(first.answer, { delay: 0 });
      for (let index = 0; index < first.cells.length; index++) assert.equal(await page.locator(`[id="cross-${first.cells[index]}"]`).inputValue(), first.answer[index]);
      if (width === 390) {
        await page.setViewportSize({ width: 390, height: 500 });
        await firstInput.focus(); await page.keyboard.press('ArrowDown');
        const focusBounds = await page.locator('input:focus').boundingBox();
        assert.ok(focusBounds.y >= 0 && focusBounds.y + focusBounds.height <= 501, 'Active cell hidden at short viewport');
        await page.screenshot({ path: `${out}/experiences-crossword-short-viewport.png`, fullPage: false });
        await page.setViewportSize({ width: 390, height: 844 });
        const intersection = Object.keys(bank[0].solution).find(key => bank[0].entries.filter(entry => entry.cells.includes(key)).length > 1);
        const input = page.locator(`[id="cross-${intersection}"]`);
        await input.focus();
        const before = await page.locator('#cross-clue-text').innerText();
        await input.press('Space');
        assert.notEqual(await page.locator('#cross-clue-text').innerText(), before);
        const correct = bank[0].solution[intersection];
        await input.fill(correct === 'Z' ? 'X' : 'Z');
        await page.getByRole('button', { name: 'Concluir', exact: true }).click();
        assert.ok(await page.locator('.cross-cell.incorrect').count() > 0);
        await page.getByRole('button', { name: 'Limpar', exact: true }).click();
        await page.getByRole('button', { name: 'Apagar preenchimento', exact: true }).click();
        await input.focus(); await input.press('Backspace'); assert.equal(await input.inputValue(), '');
        await input.press('Tab'); assert.ok((await page.evaluate(() => document.activeElement.id)).startsWith('cross-'));
        await solve(page, bank[0]);
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile')).fragments === 10);
        await page.getByRole('button', { name: 'Voltar', exact: true }).click();
        await page.getByRole('button', { name: 'Abrir Cruzadas Diretas', exact: true }).click();
      await page.getByRole('button', { name: 'Abrir cruzada', exact: true }).click();
        await solve(page, bank[0]);
        await page.getByText('Cruzada completa!', { exact: false }).waitFor();
        assert.equal((await profile(page)).fragments, 10);
        await choose(page, bank[2]);
        await solve(page, bank[2]);
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile')).fragments === 22);
        await choose(page, bank[5]);
        assert.equal(await page.getByRole('button', { name: 'Concluir', exact: true }).isDisabled(), false);
        const hardLast = bank[5].entries[bank[5].entries.length - 1];
        await page.getByRole('button', { name: `Pista: ${hardLast.clue}, ${hardLast.direction === 'H' ? 'horizontal' : 'vertical'}`, exact: true }).click();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'cross-check', 'Hard incomplete final word traps Tab');
        const hardFirst = bank[5].entries[0];
        await page.getByRole('button', { name: `Pista: ${hardFirst.clue}, ${hardFirst.direction === 'H' ? 'horizontal' : 'vertical'}`, exact: true }).click();
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'cross-check', 'First word traps reverse Tab');
        await capture(page, 'experiences-crossword-hard-mobile');
        await solve(page, bank[5]);
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('the_pulse_game_v10_profile')).fragments === 38);
        await page.getByRole('button', { name: 'Limpar', exact: true }).click();
        await page.getByRole('button', { name: 'Manter', exact: true }).click();
        await page.getByText('Cruzada completa!', { exact: false }).waitFor();
        cases.push('crossword three levels, full completions, shared letters, space direction, backspace, Tab, paste, check, persistence and no repeat reward');
      } else {
        await page.getByRole('button', { name: 'Voltar', exact: true }).click();
        await page.getByRole('button', { name: 'Abrir Cruzadas Diretas', exact: true }).click();
      await page.getByRole('button', { name: 'Abrir cruzada', exact: true }).click();
        await firstInput.waitFor(); assert.equal(await firstInput.inputValue(), first.answer[0]);
      }
      cases.push(`home, echo solution, purchase, reduced motion and crossword keyboard: ${width}`);
      await ctx.close();
    }
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await ctx.route('**/crosswords/upstream.json', route => route.abort());
      await page.goto(url); await page.getByRole('button', { name: 'Abrir Cruzadas Diretas', exact: true }).click();
      await page.getByText('Não foi possível abrir as cruzadas.', { exact: true }).waitFor();
      await ctx.unroute('**/crosswords/upstream.json');
      await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
      await page.getByLabel('Nível', { exact: true }).waitFor();
      cases.push('crossword load failure and retry');
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    const report = { pass: true, cases, pageErrors: errors, limitation: 'Chromium viewport/touch emulation, not a physical mobile keyboard or screen reader' };
    fs.writeFileSync(`${out}/experiences-results.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

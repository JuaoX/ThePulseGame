const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const executable = process.env.PULSE_CHROMIUM || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
  const browser = await chromium.launch({ headless: true, ...(executable ? { executablePath: executable } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(process.env.PULSE_BASE_URL || 'http://127.0.0.1:5180/');
    await page.getByRole('button', { name: 'Abrir Arena Pulse', exact: true }).tap();
    const prompt = await page.locator('.question-panel h2').innerText();
    await page.locator('.answer-option').first().tap();
    await page.waitForFunction(previous => document.querySelector('.question-panel h2')?.textContent !== previous, prompt);
    await page.getByRole('button', { name: 'Pausar', exact: true }).tap();
    await page.getByRole('dialog', { name: 'Pausa', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Continuar', exact: true }).tap();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Sair', exact: true }).tap();
    await page.getByRole('button', { name: 'Sair da partida', exact: true }).tap();
    await page.locator('.bottom-nav').getByRole('button', { name: 'Coleção', exact: true }).tap();
    await page.getByRole('button', { name: 'Ver Luna', exact: true }).tap(); await page.getByRole('button', { name: 'Usar personagem', exact: true }).tap();
    assert.equal(await page.getByRole('button', { name: 'Em uso', exact: true }).count(), 1);
    await page.locator('.bottom-nav').getByRole('button', { name: 'Explorar', exact: true }).tap();
    await page.getByRole('button', { name: 'Abrir Cruzadas Diretas', exact: true }).tap();
    await page.locator('.cross-clue-cell button').first().tap();
    assert.ok((await page.evaluate(() => document.activeElement.id)).startsWith('cross-'));
    await page.keyboard.type('IOLAO');
    await page.getByText('1/8 palavras certas', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Voltar', exact: true }).tap();
    await page.getByRole('button', { name: 'Abrir Ecos', exact: true }).tap();
    await page.getByRole('button', { name: /^Sinal A:/ }).tap();
    await page.getByRole('button', { name: /^Sinal B:/ }).tap();
    await page.getByText('Em sintonia!', { exact: true }).waitFor();
    const result = { pass: true, method: 'Chromium touchscreen tap events at 390x844 plus emulated keyboard; not physical', cases: ['one-tap start', 'answer and automatic next', 'pause/resume', 'leave', 'bottom navigation', 'character selection', 'tap arrow clue and continuous crossword typing', 'echo touch controls'] };
    fs.writeFileSync('.impeccable/review/touch-results.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });


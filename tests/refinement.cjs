const fs = require('fs');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 const cases=[];
 try {
 for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:width>800?1000:844},hasTouch:width<800,isMobile:width<800,reducedMotion:'reduce'});
  await page.goto(process.env.PULSE_BASE_URL || 'http://127.0.0.1:5180/'); await page.evaluate(()=>document.fonts.ready);
  const nav=page.locator(width>760?'.desktop-nav':'.bottom-nav');
  const positions=[];
  for(const tab of ['Explorar','Recordes','Coleção']) {await nav.getByRole('button',{name:tab,exact:true}).click();positions.push((await page.locator('main').boundingBox()).x);}
  assert.ok(Math.max(...positions)-Math.min(...positions)<1,`Tab shift ${width}: ${positions}`);
  const heights=[],tops=[];
  for(const name of ['Kael','Luna','Leo','Maya','Shinobi','8-Bit','Kael · Órbita','Luna · Aurora','Shinobi · Fantasma']) {
   await page.getByRole('button',{name:`Ver ${name}`,exact:true}).click();
   heights.push((await page.locator('.character-showcase').boundingBox()).height);tops.push((await page.locator('.character-grid').boundingBox()).y+await page.evaluate(()=>scrollY));
  }
  assert.ok(Math.max(...heights)-Math.min(...heights)<1,`Showcase shift ${width}: ${heights}`);
  assert.ok(Math.max(...tops)-Math.min(...tops)<1,`Grid shift ${width}: ${tops}`);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`.impeccable/review/refinement-collection-${width}.png`,fullPage:true});
  await nav.getByRole('button',{name:'Explorar',exact:true}).click();await page.getByRole('button',{name:'Abrir Cruzadas Diretas',exact:true}).click();
  await page.getByLabel('Nível',{exact:true}).waitFor(); await page.getByRole('button',{name:'Abrir cruzada',exact:true}).click();
  const clue=page.locator('.cross-clue-cell button').first();
  if(width>800) await clue.hover(); else await clue.tap();
  await page.getByRole('tooltip').waitFor();assert.ok((await page.getByRole('tooltip').innerText()).length>12);
  const tip=await page.getByRole('tooltip').boundingBox();assert.ok(tip.x>=0&&tip.x+tip.width<=width&&tip.y>=0&&tip.y+tip.height<844);
  await page.screenshot({path:`.impeccable/review/refinement-crossword-${width}.png`,fullPage:false});
  assert.ok(!/palavras certas|Conferir letras|Teclado e navegação|Todas as pistas/.test(await page.locator('body').innerText()));
  const back=await page.getByRole('button',{name:'Voltar',exact:true}).boundingBox(), title=await page.getByRole('heading',{name:'Cruzadas Diretas',exact:true}).boundingBox();assert.ok(back.x<title.x);
  const button=await page.getByRole('button',{name:'Concluir',exact:true}).boundingBox();assert.ok(button.y+button.height<844);
  await page.getByRole('button',{name:'Concluir',exact:true}).click();assert.equal(await page.locator('.cross-results').count(),0);assert.equal(await page.locator('.cross-cell input:not([readonly])').count(),0);
  await page.getByRole('button',{name:'Próxima',exact:true}).click(); assert.equal(await page.locator('.edition-finished').count(),1); await page.getByRole('button',{name:'Abrir cruzada',exact:true}).click();
  if(width===390) {await page.setViewportSize({width,height:500});await page.evaluate(()=>scrollTo(0,0));const b=await page.getByRole('button',{name:'Concluir',exact:true}).boundingBox();assert.ok(b.y+b.height<500);await page.screenshot({path:'.impeccable/review/refinement-crossword-short.png',fullPage:false});}
  cases.push(`Stable tabs, all character selections, clue expansion, manual reveal, finalized edition marks, reachable actions at ${width}`);await page.close();
 }
 fs.writeFileSync('.impeccable/review/refinement-results.json',JSON.stringify({pass:true,cases,limit:'Browser emulation; no physical mobile keyboard or screen reader'},null,2));console.log(JSON.stringify({pass:true,cases},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

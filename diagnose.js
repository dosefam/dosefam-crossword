/* ============================================================
 * EDD CROSSWORD — SCROLL DIAGNOSTIC
 *
 * Paste this entire block into Safari's JS console while viewing
 * the live page on your phone (or Chrome dev-tools mobile mode).
 *
 * It will:
 *  1) Log every scroll event with stack traces showing what triggered it
 *  2) Patch scrollIntoView, scrollTo, scrollBy, focus() to log calls
 *  3) Watch for focus changes
 *  4) Show a tiny floating panel on screen with live readings
 *
 * After pasting, tap a cell, type letters, and watch the panel.
 * The panel will tell you exactly which scroll source fires per keystroke.
 * ============================================================ */

(function diagnose(){
  // ---------- visible on-screen panel (since console is hard on mobile) ----------
  const old = document.getElementById('diag-panel');
  if(old) old.remove();
  const panel = document.createElement('div');
  panel.id = 'diag-panel';
  panel.style.cssText = `
    position: fixed; left: 6px; top: 6px;
    width: calc(100% - 12px); max-width: 520px;
    max-height: 50vh; overflow:auto;
    background: #000c; color:#0f0;
    font: 11px/1.3 ui-monospace, monospace;
    padding: 8px 10px; border-radius: 8px;
    z-index: 99999;
    white-space: pre-wrap; word-break: break-word;
    border: 1px solid #0f04;
  `;
  panel.textContent = 'EDD diagnostic active. Tap a cell and type.\n';
  document.body.appendChild(panel);

  const close = document.createElement('button');
  close.textContent = '✕ close diag';
  close.style.cssText = `
    position: fixed; right: 6px; top: 6px; z-index: 100000;
    background: #f00; color:#fff; border:0; border-radius: 6px;
    padding: 6px 10px; font: 11px ui-monospace, monospace;
  `;
  close.onclick = () => { panel.remove(); close.remove(); };
  document.body.appendChild(close);

  let lines = [];
  function log(msg){
    const t = (performance.now()/1000).toFixed(2);
    lines.push(`[${t}s] ${msg}`);
    if(lines.length > 80) lines = lines.slice(-80);
    panel.textContent = lines.join('\n');
    panel.scrollTop = panel.scrollHeight;
    console.log('[DIAG]', msg);
  }

  // ---------- stack helper ----------
  function shortStack(){
    try { throw new Error('s'); }
    catch(e){
      const lines = (e.stack||'').split('\n').slice(2,7);
      return lines.map(l => l.trim().replace(/.*\//,'').replace(/[?#].*/, '')).join(' / ');
    }
  }

  // ---------- record state ----------
  const initial = {
    scrollY: window.scrollY,
    docH: document.documentElement.scrollHeight,
    visualH: window.visualViewport ? window.visualViewport.height : window.innerHeight,
    visualOffsetTop: window.visualViewport ? window.visualViewport.offsetTop : 0,
    activeEl: document.activeElement && document.activeElement.tagName,
  };
  log(`init scrollY=${initial.scrollY} docH=${initial.docH} vvH=${initial.visualH} active=${initial.activeEl}`);

  // ---------- patch scroll APIs ----------
  const realScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(...args){
    log(`scrollIntoView called on <${this.tagName.toLowerCase()}${this.id?'#'+this.id:''}${this.className?'.'+String(this.className).split(' ').join('.'):''}> stack: ${shortStack()}`);
    return realScrollIntoView.apply(this, args);
  };

  const realScrollTo = window.scrollTo;
  window.scrollTo = function(...args){
    log(`window.scrollTo(${JSON.stringify(args)}) stack: ${shortStack()}`);
    return realScrollTo.apply(this, args);
  };

  const realScrollBy = window.scrollBy;
  window.scrollBy = function(...args){
    log(`window.scrollBy(${JSON.stringify(args)}) stack: ${shortStack()}`);
    return realScrollBy.apply(this, args);
  };

  // ---------- patch focus ----------
  const realFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(...args){
    const tag = this.tagName.toLowerCase();
    const id = this.id ? '#'+this.id : '';
    const cls = this.className ? '.'+String(this.className).split(' ').join('.') : '';
    log(`focus() on <${tag}${id}${cls}>`);
    return realFocus.apply(this, args);
  };

  // ---------- listen to scroll events ----------
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const cur = window.scrollY;
    const delta = cur - lastScrollY;
    lastScrollY = cur;
    log(`scroll EVENT scrollY=${cur} (delta=${delta>=0?'+':''}${delta}) active=${document.activeElement && document.activeElement.tagName}${document.activeElement && document.activeElement.id ? '#'+document.activeElement.id : ''}`);
  }, {passive:true});

  // ---------- visual viewport (iOS keyboard area) ----------
  if(window.visualViewport){
    window.visualViewport.addEventListener('scroll', () => {
      log(`visualViewport.scroll offsetTop=${window.visualViewport.offsetTop} pageTop=${window.visualViewport.pageTop}`);
    });
    window.visualViewport.addEventListener('resize', () => {
      log(`visualViewport.resize H=${window.visualViewport.height} offsetTop=${window.visualViewport.offsetTop} (keyboard ${window.innerHeight > window.visualViewport.height ? 'OPEN' : 'closed'})`);
    });
  }

  // ---------- focus changes ----------
  document.addEventListener('focusin', e => {
    const t = e.target;
    log(`focusin: <${t.tagName.toLowerCase()}${t.id?'#'+t.id:''}> at scrollY=${window.scrollY}`);
  }, true);
  document.addEventListener('focusout', e => {
    const t = e.target;
    log(`focusout: <${t.tagName.toLowerCase()}${t.id?'#'+t.id:''}> at scrollY=${window.scrollY}`);
  }, true);

  // ---------- key events ----------
  document.addEventListener('keydown', e => {
    log(`keydown "${e.key}" target=<${e.target.tagName.toLowerCase()}${e.target.id?'#'+e.target.id:''}>`);
  }, true);

  // ---------- input events ----------
  document.addEventListener('input', e => {
    log(`input target=<${e.target.tagName.toLowerCase()}${e.target.id?'#'+e.target.id:''}> value="${e.target.value||''}"`);
  }, true);

  // ---------- click events ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('.cell, .clue-item, button') || e.target;
    log(`click <${t.tagName.toLowerCase()}${t.id?'#'+t.id:''}${t.className?'.'+String(t.className).split(' ').slice(0,2).join('.'):''}>`);
  }, true);

  log('diagnostic patches installed. tap a cell now.');
})();

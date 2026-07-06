/*
 * SmartGraph Mockup Feedback Widget
 * ---------------------------------
 * Lets any visitor pin a comment onto the mockup. Submitting opens a
 * pre-filled GitHub "new issue" page; pressing Submit there files the
 * issue, which triggers the AI-fix workflow in .github/workflows/.
 *
 * Zero dependencies, zero backend. Configure below.
 */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────
  var CONFIG = {
    owner: 'light42-dev',
    repo: 'uss-blue-sky',
    // Hidden marker the GitHub Action looks for to auto-trigger the AI fix.
    marker: '<!-- smartgraph-feedback-widget v1 -->',
    maxCommentChars: 1500,
    maxUrlChars: 7500
  };

  var STRINGS = {
    fabLabel: '💬 Feedback',
    pinHint: 'Click anywhere on the page to pin your comment (Esc to cancel)',
    formTitle: 'Describe the change',
    placeholder: 'What should be different here? e.g. "This button is too small on mobile"',
    nameLabel: 'Name (optional)',
    submit: 'File on GitHub →',
    cancel: 'Cancel',
    afterOpen: 'A pre-filled GitHub issue opened in a new tab — press "Submit new issue" there to file it. The AI fix kicks off automatically.',
    popupBlocked: 'The browser blocked the new tab. Allow pop-ups for this site, or use this link:',
    openLink: 'Open GitHub issue form',
    tooLong: 'Comment shortened to fit GitHub URL limits.'
  };

  // ── Shadow-DOM host (keeps mockup CSS untouched) ───────────────
  var host = document.createElement('div');
  host.id = 'sgfb-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = [
    ':host { all: initial; }',
    '* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
    '.fab { position: fixed; right: 18px; bottom: 18px; pointer-events: auto; cursor: pointer;',
    '  background: #3f8a7c; color: #fff; border: none; border-radius: 999px;',
    '  padding: 12px 18px; font-size: 14px; font-weight: 600;',
    '  box-shadow: 0 4px 16px rgba(44,40,35,.28); transition: transform .12s ease; }',
    '.fab:hover { transform: scale(1.05); }',
    '.overlay { position: fixed; inset: 0; pointer-events: auto; cursor: crosshair;',
    '  background: rgba(63,138,124,.07); }',
    '.hint { position: fixed; top: 14px; left: 50%; transform: translateX(-50%);',
    '  background: #2c2823; color: #fff; padding: 8px 16px; border-radius: 8px;',
    '  font-size: 13px; pointer-events: none; box-shadow: 0 4px 14px rgba(0,0,0,.25); }',
    '.pin { position: fixed; width: 26px; height: 26px; margin: -13px 0 0 -13px;',
    '  border-radius: 50% 50% 50% 0; background: #d2603a; transform: rotate(-45deg);',
    '  box-shadow: 0 2px 8px rgba(0,0,0,.35); pointer-events: none; }',
    '.pin::after { content: ""; position: absolute; inset: 7px; border-radius: 50%; background: #fff; }',
    '.panel { position: fixed; width: 320px; max-width: calc(100vw - 24px);',
    '  background: #fff; border-radius: 14px; box-shadow: 0 12px 40px rgba(44,40,35,.3);',
    '  padding: 14px; pointer-events: auto; }',
    '.panel h3 { margin: 0 0 8px; font-size: 14px; color: #2c2823; }',
    '.panel textarea { width: 100%; min-height: 84px; resize: vertical; font-size: 13px;',
    '  border: 1px solid rgba(44,40,35,.25); border-radius: 8px; padding: 8px; color: #2c2823; }',
    '.panel input { width: 100%; font-size: 13px; border: 1px solid rgba(44,40,35,.25);',
    '  border-radius: 8px; padding: 7px 8px; margin-top: 8px; color: #2c2823; }',
    '.panel label { font-size: 11px; color: #6b655c; display: block; margin-top: 8px; }',
    '.row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }',
    '.btn { border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px;',
    '  font-weight: 600; cursor: pointer; }',
    '.btn-primary { background: #3f8a7c; color: #fff; }',
    '.btn-primary:disabled { opacity: .5; cursor: default; }',
    '.btn-ghost { background: transparent; color: #6b655c; }',
    '.toast { position: fixed; bottom: 74px; right: 18px; max-width: 320px;',
    '  background: #2c2823; color: #fff; font-size: 13px; line-height: 1.45;',
    '  padding: 12px 14px; border-radius: 10px; pointer-events: auto;',
    '  box-shadow: 0 6px 20px rgba(0,0,0,.3); }',
    '.toast a { color: #8fd8c8; }',
    '.meta { font-size: 11px; color: #6b655c; margin-top: 6px; word-break: break-all; }'
  ].join('\n');
  root.appendChild(style);

  // ── State ──────────────────────────────────────────────────────
  var state = { mode: 'idle', pin: null, nodes: {} };

  // ── Helpers ────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function currentRoute() {
    var h = (window.location.hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
    return h || '(default)';
  }

  // Descend through same-origin iframes to find the real element under a point.
  function deepElementFromPoint(x, y) {
    var doc = document;
    var elem = doc.elementFromPoint(x, y);
    var guard = 0;
    while (elem && elem.tagName === 'IFRAME' && guard++ < 4) {
      var rect = elem.getBoundingClientRect();
      var inner;
      try { inner = elem.contentDocument; } catch (e) { break; }
      if (!inner) break;
      var innerEl = inner.elementFromPoint(x - rect.left, y - rect.top);
      if (!innerEl) break;
      elem = innerEl;
    }
    return elem;
  }

  // Compact CSS path: stops at an id, max 6 levels.
  function cssPath(elem) {
    var parts = [];
    var depth = 0;
    while (elem && elem.nodeType === 1 && depth++ < 6 && elem.tagName !== 'HTML') {
      var part = elem.tagName.toLowerCase();
      if (elem.id) { parts.unshift(part + '#' + elem.id); break; }
      var cls = (elem.className && typeof elem.className === 'string')
        ? elem.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      if (cls) part += '.' + cls;
      var parent = elem.parentElement;
      if (parent) {
        var same = Array.prototype.filter.call(parent.children, function (c) {
          return c.tagName === elem.tagName;
        });
        if (same.length > 1) part += ':nth-of-type(' + (same.indexOf(elem) + 1) + ')';
      }
      parts.unshift(part);
      elem = parent;
    }
    return parts.join(' > ');
  }

  function describePoint(x, y) {
    host.style.pointerEvents = 'none';
    var target = deepElementFromPoint(x, y);
    host.style.pointerEvents = '';
    var text = target ? (target.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) : '';
    return {
      selector: target ? cssPath(target) : '(none)',
      text: text || '(no text)',
      xPct: Math.round((x / window.innerWidth) * 100),
      yPct: Math.round((y / window.innerHeight) * 100)
    };
  }

  function buildIssueUrl(comment, name, pin) {
    var route = currentRoute();
    var title = '[Feedback] ' + comment.replace(/\s+/g, ' ').slice(0, 60) + (comment.length > 60 ? '…' : '');
    var body = [
      '### 💬 Mockup feedback', '',
      '> ' + comment.split('\n').join('\n> '), '',
      '| Field | Value |', '| --- | --- |',
      '| Page route | `#' + route + '` |',
      '| Pinned element | `' + pin.info.selector + '` |',
      '| Element text | ' + pin.info.text + ' |',
      '| Click position | ' + pin.info.xPct + '% from left, ' + pin.info.yPct + '% from top |',
      '| Viewport | ' + window.innerWidth + '×' + window.innerHeight + ' |',
      '| Page URL | ' + window.location.href + ' |',
      '| Submitted | ' + new Date().toISOString() + ' |',
      '| From | ' + (name || 'anonymous') + ' |', '',
      CONFIG.marker, '',
      '_Filed via the on-page feedback widget._'
    ].join('\n');

    var base = 'https://github.com/' + CONFIG.owner + '/' + CONFIG.repo + '/issues/new';
    var url = base + '?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    if (url.length > CONFIG.maxUrlChars) {
      body = body.slice(0, 3000) + '\n\n' + CONFIG.marker;
      url = base + '?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(body);
    }
    return url;
  }

  // ── UI pieces ──────────────────────────────────────────────────
  function clear(names) {
    names.forEach(function (n) {
      if (state.nodes[n]) { state.nodes[n].remove(); delete state.nodes[n]; }
    });
  }

  function toast(html, ms) {
    clear(['toast']);
    var t = el('div', 'toast');
    t.innerHTML = html;
    root.appendChild(t);
    state.nodes.toast = t;
    if (ms) setTimeout(function () { clear(['toast']); }, ms);
  }

  function enterPinMode() {
    state.mode = 'pinning';
    var overlay = el('div', 'overlay');
    var hint = el('div', 'hint', STRINGS.pinHint);
    overlay.addEventListener('click', function (ev) {
      ev.preventDefault();
      placePin(ev.clientX, ev.clientY);
    });
    root.appendChild(overlay);
    root.appendChild(hint);
    state.nodes.overlay = overlay;
    state.nodes.hint = hint;
  }

  function exitToIdle() {
    clear(['overlay', 'hint', 'pin', 'panel']);
    state.mode = 'idle';
    state.pin = null;
  }

  function placePin(x, y) {
    clear(['overlay', 'hint']);
    state.mode = 'commenting';
    state.pin = { x: x, y: y, info: describePoint(x, y) };

    var pin = el('div', 'pin');
    pin.style.left = x + 'px';
    pin.style.top = y + 'px';
    root.appendChild(pin);
    state.nodes.pin = pin;

    var panel = el('div', 'panel');
    var panelW = 320, panelH = 250;
    var px = Math.min(Math.max(8, x + 16), window.innerWidth - panelW - 8);
    var py = Math.min(Math.max(8, y + 16), window.innerHeight - panelH - 8);
    panel.style.left = px + 'px';
    panel.style.top = py + 'px';

    var h3 = el('h3', null, STRINGS.formTitle);
    var ta = document.createElement('textarea');
    ta.placeholder = STRINGS.placeholder;
    ta.maxLength = CONFIG.maxCommentChars;
    var nameLabel = el('label', null, STRINGS.nameLabel);
    var nameInput = document.createElement('input');
    try { nameInput.value = localStorage.getItem('sgfb-name') || ''; } catch (e) {}
    var meta = el('div', 'meta', '📍 ' + state.pin.info.selector);
    var row = el('div', 'row');
    var cancelBtn = el('button', 'btn btn-ghost', STRINGS.cancel);
    var submitBtn = el('button', 'btn btn-primary', STRINGS.submit);
    submitBtn.disabled = true;

    ta.addEventListener('input', function () { submitBtn.disabled = !ta.value.trim(); });
    cancelBtn.addEventListener('click', exitToIdle);
    submitBtn.addEventListener('click', function () {
      var comment = ta.value.trim();
      if (!comment) return;
      try { localStorage.setItem('sgfb-name', nameInput.value.trim()); } catch (e) {}
      var url = buildIssueUrl(comment, nameInput.value.trim(), state.pin);
      var win = window.open(url, '_blank', 'noopener');
      exitToIdle();
      if (win) {
        toast(STRINGS.afterOpen, 9000);
      } else {
        toast(STRINGS.popupBlocked + ' <a href="' + url + '" target="_blank" rel="noopener">' + STRINGS.openLink + '</a>');
      }
    });

    row.appendChild(cancelBtn);
    row.appendChild(submitBtn);
    panel.appendChild(h3);
    panel.appendChild(ta);
    panel.appendChild(nameLabel);
    panel.appendChild(nameInput);
    panel.appendChild(meta);
    panel.appendChild(row);
    root.appendChild(panel);
    state.nodes.panel = panel;
    ta.focus();
  }

  // ── Wire up ────────────────────────────────────────────────────
  var fab = el('button', 'fab', STRINGS.fabLabel);
  fab.setAttribute('aria-label', 'Leave feedback on this mockup');
  fab.addEventListener('click', function () {
    if (state.mode === 'idle') { clear(['toast']); enterPinMode(); }
    else exitToIdle();
  });
  root.appendChild(fab);

  window.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && state.mode !== 'idle') exitToIdle();
  });

  // Drop the pin overlay when the route changes mid-flow.
  window.addEventListener('hashchange', exitToIdle);
})();

/* Tiny dependency-free syntax highlighter for <pre class="code" data-lang="…">.
   Emits spans: .tk-cm (comment) .tk-str (string) .tk-an (annotation) .tk-kw (keyword)
   .tk-ty (Type) .tk-num (number) .tk-fn (call). Escapes HTML itself: authors write raw code
   inside <code>, but must still escape < and > as &lt; &gt; because the browser parses HTML first. */
(function (global) {
  'use strict';

  const JAVA_KW = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum ' +
    'extends final finally float for goto if implements import instanceof int interface long native new package private protected ' +
    'public return short static strictfp super switch synchronized this throw throws transient try void volatile while ' +
    'var record sealed permits yield non-sealed null true false').split(' '));

  const LANGS = {
    java: {
      kw: JAVA_KW,
      re: /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|"""[\s\S]*?""")|(@[A-Za-z_]\w*)|\b(\d+(?:\.\d+)?[lLfFdD]?|0x[0-9a-fA-F_]+)\b|\b([A-Z][A-Za-z0-9_]*)\b|\b([a-z_]\w*)(?=\s*\()|\b([a-z_]\w*)\b/g
    },
    kotlin: null, // falls back to java
    sql: {
      kw: new Set('select from where insert into values update set delete create table index on join left right inner outer group by order having limit offset as and or not null is in exists between like union all distinct primary key foreign references begin commit rollback transaction lock for share nowait explain analyze with'.split(' ')),
      re: /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:''|[^'\n])*')|(@\w+)|\b(\d+(?:\.\d+)?)\b|\b(SELECT_NEVER)\b|\b(\w+)(?=\s*\()|\b([A-Za-z_]\w*)\b/g,
      ci: true
    },
    yaml: {
      kw: new Set(['true', 'false', 'null', 'yes', 'no']),
      re: /(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(^\s*[\w.\-\[\]]+(?=\s*:))|\b(\d+(?:\.\d+)?)\b|()|()|\b([A-Za-z_]\w*)\b/gm
    },
    bash: {
      kw: new Set('if then else fi for do done while in case esac function export return exit echo cd ls cat grep sudo docker kubectl java jar mvn gradle curl'.split(' ')),
      re: /(#[^\n]*)|("(?:\\.|[^"\\])*"|'[^']*')|(-{1,2}[\w-]+)|\b(\d+)\b|()|()|\b([A-Za-z_][\w-]*)\b/g
    },
    properties: {
      kw: new Set(),
      re: /(#[^\n]*)|()|()|\b(\d+)\b|()|()|(^[\w.\-\[\]]+(?=\s*=))/gm
    },
    text: { kw: new Set(), re: /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*")|()|()|()|()|()/g }
  };

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function highlight(src, lang) {
    const L = LANGS[lang] || LANGS.java;
    let out = '', last = 0, m;
    L.re.lastIndex = 0;
    while ((m = L.re.exec(src)) !== null) {
      if (m.index > last) out += esc(src.slice(last, m.index));
      const [tok, cm, str, an, num, ty, fn, word] = m;
      if (cm) out += `<span class="tk-cm">${esc(tok)}</span>`;
      else if (str) out += `<span class="tk-str">${esc(tok)}</span>`;
      else if (an) out += `<span class="tk-an">${esc(tok)}</span>`;
      else if (num) out += `<span class="tk-num">${esc(tok)}</span>`;
      else if (ty) out += `<span class="tk-ty">${esc(tok)}</span>`;
      else if (fn) out += L.kw.has(fn) ? `<span class="tk-kw">${esc(tok)}</span>` : `<span class="tk-fn">${esc(tok)}</span>`;
      else if (word) out += (L.kw.has(L.ci ? word.toLowerCase() : word)) ? `<span class="tk-kw">${esc(tok)}</span>` : esc(tok);
      else out += esc(tok);
      last = m.index + tok.length;
      if (tok.length === 0) L.re.lastIndex++;
    }
    if (last < src.length) out += esc(src.slice(last));
    return out;
  }

  /* Highlights every pre.code that isn't done yet. Preserves <mark> by tokenising
     around a sentinel so authors can flag the key line. Wraps each line in .ln for walkthroughs. */
  function highlightAll(root) {
    (root || document).querySelectorAll('pre.code:not(.hl-done)').forEach(pre => {
      const code = pre.querySelector('code') || pre;
      const lang = pre.dataset.lang || 'java';
      // Pull out <mark> ranges before decoding
      let html = code.innerHTML.replace(/<mark>/g, '\u0001').replace(/<\/mark>/g, '\u0002');
      const tmp = document.createElement('textarea'); tmp.innerHTML = html;
      let text = tmp.value.replace(/^\n+/, '').replace(/\s+$/, '');
      // Strip common leading indentation
      const lines = text.split('\n');
      const indent = Math.min(...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
      text = lines.map(l => l.slice(indent)).join('\n');
      let hl = highlight(text, lang).replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
      hl = hl.split('\n').map((l, i) => `<span class="ln" data-ln="${i + 1}">${l || ' '}</span>`).join('');
      code.innerHTML = hl;
      pre.classList.add('hl-done');
      if (!pre.querySelector('.copy')) {
        const b = document.createElement('button');
        b.className = 'copy'; b.type = 'button'; b.textContent = 'Copy'; b.setAttribute('aria-label', 'Copy code');
        b.addEventListener('click', () => {
          navigator.clipboard.writeText(text).then(() => { b.textContent = 'Copied'; b.classList.add('ok'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('ok'); }, 1400); });
        });
        pre.appendChild(b);
      }
    });
  }

  global.Highlight = { highlight, highlightAll };
})(window);

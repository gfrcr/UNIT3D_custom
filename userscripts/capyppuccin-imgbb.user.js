// ==UserScript==
// @name         Capyppuccin ImgBB Upload
// @namespace    https://gfrcr.github.io/UNIT3D_custom
// @version      0.3.0
// @description  ImgBB upload + Stickers em todos os BBCode editors da capybarabr — chat, forum, PM, torrent comments, ticket compose/reply.
// @author       gfrcr
// @match        https://capybarabr.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      api.imgbb.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const LOG = '[capy-imgbb]';
  const log = (...a) => console.log(LOG, ...a);
  const warn = (...a) => console.warn(LOG, ...a);
  const KEY_STORE = 'capy-imgbb-key';
  const STICKER_STORE = 'capy-stickers';
  const STICKER_SIZE = 150; // px — alvo do resize e do [img=SIZE]
  const PAGE = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  const getKey = () => GM_getValue(KEY_STORE, '');
  const setKey = (v) => GM_setValue(KEY_STORE, v);

  // ── sticker storage ──
  function getStickers() {
    const raw = GM_getValue(STICKER_STORE, '');
    if (!raw) return [];
    try {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }
  function setStickers(arr) {
    GM_setValue(STICKER_STORE, JSON.stringify(arr));
  }
  function addSticker({ url, name = '' }) {
    const sticker = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      url,
      name,
      addedAt: Date.now()
    };
    const arr = getStickers();
    arr.push(sticker);
    setStickers(arr);
    return sticker;
  }
  function removeSticker(id) {
    setStickers(getStickers().filter((s) => s.id !== id));
  }

  const DISPLAY_SIZE_STORE = 'capy-sticker-display-size';
  const STICKER_DISPLAY_SIZES = [50, 100, 150];
  function getStickerDisplaySize() {
    const n = parseInt(GM_getValue(DISPLAY_SIZE_STORE, 100), 10);
    return STICKER_DISPLAY_SIZES.includes(n) ? n : 100;
  }
  function setStickerDisplaySize(n) {
    const v = STICKER_DISPLAY_SIZES.includes(n) ? n : 100;
    GM_setValue(DISPLAY_SIZE_STORE, v);
  }

  // ────────────────── settings page: inject API key field ──────────────────

  if (/\/users\/[^/]+\/general-settings\/edit\/?$/.test(location.pathname)) {
    injectSettingsPanel();
  }

  function injectSettingsPanel() {
    const tryInject = () => {
      const nativePanel = document.querySelector('main .panelV2');
      if (!nativePanel || document.querySelector('[data-capy-imgbb-panel]')) return;

      const panel = document.createElement('section');
      panel.className = 'panelV2';
      panel.dataset.capyImgbbPanel = '1';
      panel.style.marginTop = '16px';
      panel.innerHTML = `
        <header class="panel__header">
          <h2 class="panel__heading">ImgBB upload <small style="opacity: 0.6;">(userscript)</small></h2>
        </header>
        <div class="panel__body">
          <p style="opacity: 0.8; font-size: 13px; margin: 0 0 12px;">
            Configure sua API key do ImgBB pra colar/upar imagens em qualquer BBCode editor
            (chat, fórum, PM, comentário de torrent, ticket).
            Pega uma key gratuita em
            <a href="https://api.imgbb.com/" target="_blank" rel="noopener">api.imgbb.com</a>
            (clica em "Get API key" depois de logar).
            Armazenada localmente no Tampermonkey — não vai pro servidor.
          </p>
          <p class="form__group">
            <input type="text" id="capy-imgbb-key" class="form__text" autocomplete="off"
                   placeholder=" " spellcheck="false">
            <label class="form__label form__label--floating" for="capy-imgbb-key">
              ImgBB API key
            </label>
          </p>
          <p style="display: flex; gap: 8px; align-items: center;">
            <button type="button" class="form__button form__button--filled" data-capy-save>
              Salvar
            </button>
            <button type="button" class="form__button form__button--text" data-capy-clear>
              Limpar
            </button>
            <span data-capy-status style="opacity: 0.7; font-size: 13px;"></span>
          </p>
        </div>
      `;

      const input = panel.querySelector('#capy-imgbb-key');
      const status = panel.querySelector('[data-capy-status]');
      const refreshStatus = () => {
        const v = getKey();
        status.textContent = v
          ? `✓ key configurada (${v.length} chars)`
          : 'sem key configurada';
      };
      input.value = getKey();
      refreshStatus();

      panel.querySelector('[data-capy-save]').addEventListener('click', () => {
        setKey(input.value.trim());
        refreshStatus();
        status.textContent += ' — salva!';
      });
      panel.querySelector('[data-capy-clear]').addEventListener('click', () => {
        if (!confirm('Apagar a API key salva?')) return;
        setKey('');
        input.value = '';
        refreshStatus();
      });

      nativePanel.parentElement.insertBefore(panel, nativePanel.nextSibling);
      injectStickersPanel(panel);
      log('settings panel injected');
    };

    tryInject();
    new MutationObserver(tryInject).observe(document.body, { childList: true, subtree: true });
  }

  function injectStickersPanel(afterEl) {
    if (document.querySelector('[data-capy-stickers-panel]')) return;
    const panel = document.createElement('section');
    panel.className = 'panelV2';
    panel.dataset.capyStickersPanel = '1';
    panel.style.marginTop = '16px';
    panel.innerHTML = `
      <header class="panel__header">
        <h2 class="panel__heading">Stickers <small style="opacity:.6;">(userscript)</small></h2>
      </header>
      <div class="panel__body">
        <p style="opacity:.8;font-size:13px;margin:0 0 12px;">
          Sua biblioteca de stickers fica salva localmente neste navegador
          (não sincroniza entre máquinas). Use exportar/importar pra levar pra
          outro dispositivo.
          <strong data-capy-sticker-count></strong>
        </p>
        <p style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="form__button form__button--outlined" data-capy-stk-export>
            Exportar JSON
          </button>
          <button type="button" class="form__button form__button--text" data-capy-stk-import>
            Importar JSON
          </button>
        </p>
      </div>
    `;

    const refreshCount = () => {
      panel.querySelector('[data-capy-sticker-count]').textContent =
        `${getStickers().length} sticker(s) salvos.`;
    };
    refreshCount();

    panel.querySelector('[data-capy-stk-export]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(getStickers(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'capy-stickers.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    panel.querySelector('[data-capy-stk-import]').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const arr = JSON.parse(await file.text());
          if (!Array.isArray(arr)) throw new Error('formato inválido (esperado array)');
          if (!confirm(`Substituir sua biblioteca atual por ${arr.length} sticker(s) do arquivo?`)) return;
          setStickers(arr);
          refreshCount();
          alert('Biblioteca importada.');
        } catch (e) {
          alert('Import falhou: ' + e.message);
        }
      });
      input.click();
    });

    afterEl.parentElement.insertBefore(panel, afterEl.nextSibling);
  }

  // ────────────────── shared helpers ──────────────────

  function buildUploadButton(textarea, opts = {}) {
    const cls = opts.className || 'form__standard-icon-button';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.dataset.capyUpload = '1';
    btn.title = 'Enviar imagem (ImgBB)';
    btn.innerHTML = '<abbr title="Enviar imagem (ImgBB)"><i class="fas fa-cloud-upload-alt"></i></abbr>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.addEventListener('change', () => {
        const file = picker.files[0];
        if (file) uploadAndInsert(textarea, file);
      });
      picker.click();
    });
    return btn;
  }

  function buildStickerButton(textarea, opts = {}) {
    const cls = opts.className || 'form__standard-icon-button';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.dataset.capySticker = '1';
    btn.title = 'Stickers';
    btn.innerHTML = '<abbr title="Stickers"><i class="fas fa-note-sticky"></i></abbr>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openStickerPicker(btn, textarea);
    });
    return btn;
  }

  // BBCode tags used on raw textareas (chat-like subset, PT-BR titles).
  const RAW_BBCODE_TAGS = [
    { open: '[b]',       close: '[/b]',       icon: 'fa-bold',          title: 'Negrito' },
    { open: '[i]',       close: '[/i]',       icon: 'fa-italic',        title: 'Itálico' },
    { open: '[u]',       close: '[/u]',       icon: 'fa-underline',     title: 'Sublinhado' },
    { open: '[s]',       close: '[/s]',       icon: 'fa-strikethrough', title: 'Riscado' },
    { open: '[img]',     close: '[/img]',     icon: 'fa-image',         title: 'Imagem' },
    { open: '[url]',     close: '[/url]',     icon: 'fa-link',          title: 'Link' },
    { open: '[code]',    close: '[/code]',    icon: 'fa-code',          title: 'Código' },
    { open: '[quote]',   close: '[/quote]',   icon: 'fa-quote-right',   title: 'Citação' },
    { open: '[spoiler]', close: '[/spoiler]', icon: 'fa-eye-slash',     title: 'Spoiler' },
  ];

  function buildBbcodeButton(textarea, def, className) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.title = def.title;
    btn.innerHTML = `<abbr title="${def.title}"><i class="fas ${def.icon}"></i></abbr>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      wrapSelection(textarea, def.open, def.close);
    });
    return btn;
  }

  function wrapSelection(textarea, openTag, closeTag) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.substring(0, start);
    const selection = textarea.value.substring(start, end);
    const after = textarea.value.substring(end);
    textarea.value = before + openTag + selection + closeTag + after;
    if (selection.length === 0) {
      const pos = start + openTag.length;
      textarea.selectionStart = textarea.selectionEnd = pos;
    } else {
      textarea.selectionStart = start;
      textarea.selectionEnd = end + openTag.length + closeTag.length;
    }
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  }

  function wirePaste(textarea) {
    if (textarea.dataset.capyPasteWired) return;
    textarea.dataset.capyPasteWired = '1';
    textarea.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) uploadAndInsert(textarea, blob);
    });
  }

  // ────────────────── context 1: chat ──────────────────

  waitForChat()
    .then(({ form, textarea }) => {
      const bar = form.querySelector('.form__bbcode-buttons');
      if (bar && !bar.querySelector('[data-capy-upload]')) {
        bar.appendChild(buildUploadButton(textarea));
        bar.appendChild(buildStickerButton(textarea));
        log('chat: upload + sticker buttons injected');
      }
      wirePaste(textarea);
      log('chat: paste handler wired');
    })
    .catch(() => { /* chat absent on this page — silent */ });

  function waitForChat({ timeoutMs = 15000, pollMs = 100 } = {}) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        const el = document.getElementById('chatbody');
        const ta = document.getElementById('chatbox__messages-create');
        const form = document.querySelector('form.chatroom__new-message');
        const data = el && PAGE.Alpine?.$data ? PAGE.Alpine.$data(el) : null;
        if (el && ta && form && data?.bbCodeWrapper) {
          return resolve({ chatEl: el, form, textarea: ta, chatData: data });
        }
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(tick, pollMs);
      };
      tick();
    });
  }

  // ────────────────── context 2: rich .bbcode-input (forum, PM, etc.) ──────────────────

  bootRichBbcodeInputs();

  function bootRichBbcodeInputs() {
    const tryInit = () => {
      for (const bi of document.querySelectorAll('.bbcode-input')) {
        if (bi.dataset.capyWired) continue;
        const textarea = bi.querySelector('textarea.bbcode-input__input, textarea');
        const iconBar = bi.querySelector('.bbcode-input__icon-bar');
        if (!textarea || !iconBar) continue;

        // Match the existing pattern (each button is wrapped in <li>)
        const li = document.createElement('li');
        li.appendChild(buildUploadButton(textarea));
        iconBar.appendChild(li);
        const liSticker = document.createElement('li');
        liSticker.appendChild(buildStickerButton(textarea));
        iconBar.appendChild(liSticker);

        wirePaste(textarea);
        bi.dataset.capyWired = '1';
        log('rich bbcode-input wired:', textarea.id || textarea.name);
      }
    };
    tryInit();
    new MutationObserver(tryInit).observe(document.body, { childList: true, subtree: true });
  }

  // ────────────────── context 3: raw textareas (torrent / ticket comments) ──────────────────

  bootRawTextareas();

  function bootRawTextareas() {
    // Conhecidos pela inspeção live:
    //   #new-comment__textarea — torrent show comments + ticket show comments
    //   #body — ticket create
    const RAW_TARGETS = ['#new-comment__textarea', '#tickets-create form textarea[name="body"]', 'form[action*="/tickets"] textarea#body'];

    const tryInit = () => {
      const found = new Set();
      // Heurística simples e segura: textareas que TÊM um data-bbcode hint OU
      // estão num form que envia pra rotas conhecidas de comments/tickets.
      // Pra evitar falsos positivos (formulários de busca, etc.), exigimos
      // ID conhecido OU contexto de form action explícito.
      const candidates = [
        document.getElementById('new-comment__textarea'),
        document.getElementById('edit-comment'),
        document.getElementById('body')
      ].filter(Boolean);

      for (const ta of candidates) {
        if (ta.dataset.capyWired) continue;
        if (ta.closest('.bbcode-input')) continue; // já tratado pelo rich path
        // Filtro extra pro #body: só se o form for de ticket
        if (ta.id === 'body') {
          const form = ta.closest('form');
          if (!form || !/\/tickets/i.test(form.action || '')) continue;
        }

        const bar = document.createElement('div');
        bar.className = 'capy-raw-bar';
        bar.dataset.capyRawBar = '1';
        bar.style.cssText = 'display:flex; gap:4px; padding:0; margin:0; flex-wrap:wrap;';
        // Mesma família de classes do toolbar nativo do chat (--skinny pra ficar compacto).
        const btnCls = 'form__button form__standard-icon-button form__standard-icon-button--skinny';
        for (const def of RAW_BBCODE_TAGS) {
          bar.appendChild(buildBbcodeButton(ta, def, btnCls));
        }
        bar.appendChild(buildUploadButton(ta, { className: btnCls }));
        bar.appendChild(buildStickerButton(ta, { className: btnCls }));
        // O <p class="form__group"> contém textarea + <label class="form__label--floating">.
        // A label é position:absolute relativa ao <p>. Se eu inserir a barra DENTRO do <p>,
        // a label flutua pra cima da barra. Inserir ANTES do <p> mantém o conjunto intacto.
        const formGroup = ta.closest('.form__group');
        const anchor = formGroup && formGroup.parentElement ? formGroup : ta;
        anchor.parentElement.insertBefore(bar, anchor);
        // O form pai é flex com gap (16px na capy) — isso afasta a barra do
        // textarea. Puxa de volta com margin-bottom negativo, deixando ~4px.
        const parentCS = getComputedStyle(anchor.parentElement);
        if (parentCS.display.includes('flex')) {
          const rowGap = parseFloat(parentCS.rowGap || parentCS.gap || '0') || 0;
          if (rowGap > 4) bar.style.marginBottom = `-${rowGap - 4}px`;
        }

        wirePaste(ta);
        ta.dataset.capyWired = '1';
        found.add(ta.id);
        log('raw textarea wired:', ta.id);
      }
    };
    tryInit();
    new MutationObserver(tryInit).observe(document.body, { childList: true, subtree: true });
  }

  // ────────────────── upload core ──────────────────

  async function uploadAndInsert(textarea, blob) {
    const key = getKey();
    if (!key) {
      const me = location.pathname.match(/\/users\/([^/]+)/)?.[1] || 'SEU_USER';
      alert(
        'ImgBB API key não configurada.\n\n' +
        `Vai em capybarabr.com/users/${me}/general-settings/edit ` +
        '→ painel "ImgBB upload" → cola sua key e salva.'
      );
      return;
    }

    const placeholder = `[uploading ${humanSize(blob.size)}...]`;
    insertAtCursor(textarea, placeholder);

    try {
      const url = await uploadBlob(blob);
      replaceInTextarea(textarea, placeholder, `[img]${url}[/img]`);
      log('uploaded:', url);
    } catch (err) {
      replaceInTextarea(textarea, placeholder, '');
      warn('upload failed:', err);
      alert('Upload falhou: ' + err.message);
    }
  }

  function gmRequest(opts) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: opts.method,
        url: opts.url,
        data: opts.data,
        responseType: opts.responseType,
        onload: (r) => {
          if (r.status < 200 || r.status >= 300) {
            return reject(new Error(`HTTP ${r.status}: ${r.statusText || ''}`.trim()));
          }
          let body = r.response;
          if (body === undefined || body === null || typeof body === 'string') {
            try { body = JSON.parse(r.responseText); } catch (e) { return reject(new Error('invalid JSON response')); }
          }
          resolve(body);
        },
        onerror: () => reject(new Error('network error')),
        ontimeout: () => reject(new Error('request timed out'))
      });
    });
  }

  // Sobe um blob pro ImgBB e retorna a URL direta. Lança em erro.
  async function uploadBlob(blob) {
    const key = getKey();
    if (!key) throw new Error('no-key');
    const fd = new FormData();
    fd.append('image', blob);
    const j = await gmRequest({
      method: 'POST',
      url: `https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`,
      data: fd,
      responseType: 'json'
    });
    if (!j.success || !j.data?.url) {
      throw new Error(j.error?.message || 'imgbb returned no url');
    }
    return j.data.url;
  }

  // Resize + upload. Retorna a URL do sticker.
  async function uploadSticker(blob) {
    const resized = await resizeImage(blob, STICKER_SIZE);
    return uploadBlob(resized);
  }

  function insertAtCursor(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.substring(0, start) + text + el.value.substring(end);
    const pos = start + text.length;
    el.selectionStart = el.selectionEnd = pos;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  }

  function replaceInTextarea(el, find, replacement) {
    el.value = el.value.replace(find, replacement);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  }

  // Encolhe o blob pra que o lado maior seja `maxSize` px. Mantém proporção,
  // não amplia. Retorna Promise<Blob>. Fallback pro blob original em erro.
  function resizeImage(blob, maxSize = STICKER_SIZE) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const longest = Math.max(w, h);
          const scale = longest > maxSize ? maxSize / longest : 1;
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, tw, th);
          canvas.toBlob((out) => {
            URL.revokeObjectURL(url);
            resolve(out || blob);
          }, 'image/png');
        } catch (_) {
          URL.revokeObjectURL(url);
          resolve(blob);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob);
      };
      img.src = url;
    });
  }

  // ── sticker picker ──
  let _openPicker = null; // { el, onDocClick }

  function closeStickerPicker() {
    if (!_openPicker) return;
    document.removeEventListener('click', _openPicker.onDocClick, true);
    _openPicker.el.remove();
    _openPicker = null;
  }

  function openStickerPicker(button, textarea) {
    if (_openPicker) {
      // Mesmo botão = toggle (fecha). Botão diferente = troca (fecha o velho,
      // abre o novo) sem exigir um clique extra.
      const sameButton = _openPicker.el.parentElement === button.parentElement;
      closeStickerPicker();
      if (sameButton) return;
    }

    const pop = document.createElement('div');
    pop.className = 'capy-sticker-pop';
    pop.style.cssText = [
      'position:absolute', 'bottom:100%', 'left:0', 'z-index:10000',
      'margin-bottom:6px', 'padding:8px',
      'background:var(--panel-bg,#2a292e)',
      'border:1px solid var(--input-text-border-color,#555)',
      'border-radius:8px',
      'display:flex', 'flex-wrap:wrap', 'gap:6px',
      'width:240px', 'max-height:240px', 'overflow-y:auto',
      'box-shadow:0 4px 16px rgba(0,0,0,.4)'
    ].join(';');

    const TILE = 'width:64px;height:64px;border-radius:6px;cursor:pointer;flex:0 0 auto;';

    function render() {
      pop.textContent = '';

      // tile "+"
      const add = document.createElement('button');
      add.type = 'button';
      add.title = 'Adicionar sticker';
      add.style.cssText = TILE +
        'display:flex;align-items:center;justify-content:center;' +
        'font-size:24px;border:1px dashed var(--input-text-border-color,#777);' +
        'background:transparent;color:inherit;';
      add.textContent = '+';
      add.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pickAndAdd(render);
      });
      pop.appendChild(add);

      const stickers = getStickers();
      if (stickers.length === 0) {
        const hint = document.createElement('div');
        hint.style.cssText = 'flex:1 1 100%;opacity:.6;font-size:12px;align-self:center;';
        hint.textContent = 'Adicione seu primeiro sticker com o +';
        pop.appendChild(hint);
        return;
      }

      for (const s of stickers) {
        const cell = document.createElement('div');
        cell.style.cssText = 'position:relative;' + TILE;

        const thumb = document.createElement('img');
        thumb.src = s.url;
        thumb.title = s.name || '';
        thumb.loading = 'lazy';
        thumb.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:6px;display:block;';
        thumb.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          insertAtCursor(textarea, `[img=${STICKER_SIZE}]${s.url}[/img]`);
          closeStickerPicker();
        });
        cell.appendChild(thumb);

        const del = document.createElement('button');
        del.type = 'button';
        del.title = 'Apagar';
        del.textContent = '×';
        del.style.cssText = [
          'position:absolute', 'top:-6px', 'right:-6px',
          'width:18px', 'height:18px', 'line-height:16px',
          'border-radius:50%', 'border:none', 'cursor:pointer',
          'background:var(--cp-red,#f38ba8)', 'color:#1a1a1a',
          'font-size:13px', 'padding:0', 'display:none'
        ].join(';');
        cell.addEventListener('mouseenter', () => { del.style.display = 'block'; });
        cell.addEventListener('mouseleave', () => { del.style.display = 'none'; });
        del.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeSticker(s.id);
          render();
        });
        cell.appendChild(del);

        pop.appendChild(cell);
      }
    }

    render();

    // ancora: o botão precisa de um pai posicionado
    const host = button.parentElement;
    const hostCS = getComputedStyle(host);
    if (hostCS.position === 'static') host.style.position = 'relative';
    host.appendChild(pop);

    // click fora fecha (capture pra pegar antes de outros handlers)
    const onDocClick = (e) => {
      if (!pop.contains(e.target) && e.target !== button && !button.contains(e.target)) {
        closeStickerPicker();
      }
    };
    document.addEventListener('click', onDocClick, true);
    _openPicker = { el: pop, onDocClick };
  }

  // Abre seletor de arquivo, sobe como sticker, salva, re-renderiza.
  function pickAndAdd(rerender) {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.addEventListener('change', async () => {
      const file = picker.files[0];
      if (!file) return;
      try {
        const url = await uploadSticker(file);
        addSticker({ url, name: (file.name || '').replace(/\.[^.]+$/, '') });
        rerender();
      } catch (err) {
        if (err.message === 'no-key') {
          const me = location.pathname.match(/\/users\/([^/]+)/)?.[1] || 'SEU_USER';
          alert(
            'ImgBB API key não configurada.\n\n' +
            `Vai em capybarabr.com/users/${me}/general-settings/edit ` +
            '→ painel "ImgBB upload" → cola sua key e salva.'
          );
        } else {
          alert('Upload do sticker falhou: ' + err.message);
        }
      }
    });
    picker.click();
  }

  // Debug handle (console) — não cria dependências internas.
  PAGE.__capyStickers = { getStickers, setStickers, addSticker, removeSticker, resizeImage, uploadSticker, openStickerPicker, closeStickerPicker, getStickerDisplaySize, setStickerDisplaySize };

  log('loaded — pathname:', location.pathname);
})();

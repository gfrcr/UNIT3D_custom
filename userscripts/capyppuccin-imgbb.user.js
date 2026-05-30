// ==UserScript==
// @name         Capyppuccin ImgBB Upload
// @namespace    https://gfrcr.github.io/UNIT3D_custom
// @version      0.2.0
// @description  ImgBB image upload (paste + button) em todos os BBCode editors da capybarabr — chat, forum, PM, torrent comments, ticket compose/reply.
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
  const PAGE = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  const getKey = () => GM_getValue(KEY_STORE, '');
  const setKey = (v) => GM_setValue(KEY_STORE, v);

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
      log('settings panel injected');
    };

    tryInject();
    new MutationObserver(tryInject).observe(document.body, { childList: true, subtree: true });
  }

  // ────────────────── shared helpers ──────────────────

  function buildUploadButton(textarea, opts = {}) {
    const cls = opts.className || 'form__standard-icon-button';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = cls;
    btn.dataset.capyUpload = '1';
    btn.title = 'Upload image to ImgBB';
    btn.innerHTML = '<abbr title="Upload image to ImgBB"><i class="fas fa-cloud-upload-alt"></i></abbr>';
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
        log('chat: upload button injected');
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
        bar.style.cssText = 'display:flex; gap:4px; padding:4px 0; margin-bottom:4px;';
        bar.appendChild(buildUploadButton(ta, { className: 'form__button form__standard-icon-button' }));
        // O <p class="form__group"> contém textarea + <label class="form__label--floating">.
        // A label é position:absolute relativa ao <p>. Se eu inserir a barra DENTRO do <p>,
        // a label flutua pra cima da barra. Inserir ANTES do <p> mantém o conjunto intacto.
        const formGroup = ta.closest('.form__group');
        const anchor = formGroup && formGroup.parentElement ? formGroup : ta;
        anchor.parentElement.insertBefore(bar, anchor);

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
      const url = j.data.url;
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

  log('loaded — pathname:', location.pathname);
})();

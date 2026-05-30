// ==UserScript==
// @name         Capyppuccin ImgBB Upload
// @namespace    https://gfrcr.github.io/UNIT3D_custom
// @version      0.1.0
// @description  Upload de imagem (paste + botão) pro chat da capybarabr via ImgBB. Protótipo pro futuro ticket de feature nativa.
// @author       gfrcr
// @match        https://capybarabr.com/*
// @grant        GM_setValue
// @grant        GM_getValue
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
    // espera o panel nativo aparecer (página é renderizada server-side, mas
    // por garantia de robustez se houver delay)
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
            Configure sua API key do ImgBB pra colar/upar imagens direto no chat.
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
    // se o DOM mudar (ex: livewire), tenta de novo
    new MutationObserver(tryInject).observe(document.body, { childList: true, subtree: true });
  }

  // ────────────────── chat: paste handler + upload button ──────────────────

  waitForChat()
    .then(({ form, textarea }) => {
      log('chat ready');
      wireUploadButton(form);
      wirePasteHandler(textarea);
    })
    .catch((e) => warn('chat not ready:', e.message));

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

  function wireUploadButton(form) {
    const bar = form.querySelector('.form__bbcode-buttons');
    if (!bar) {
      warn('.form__bbcode-buttons not found — skipping upload button');
      return;
    }
    if (bar.querySelector('[data-capy-upload]')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'form__standard-icon-button';
    btn.dataset.capyUpload = '1';
    btn.title = 'Upload image to ImgBB';
    btn.innerHTML = '<abbr title="Upload image to ImgBB"><i class="fas fa-cloud-upload-alt"></i></abbr>';
    bar.appendChild(btn);

    btn.addEventListener('click', () => {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.multiple = false;
      picker.addEventListener('change', () => {
        const file = picker.files[0];
        if (file) uploadAndInsert(file);
      });
      picker.click();
    });

    log('upload button injected');
  }

  function wirePasteHandler(textarea) {
    textarea.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) uploadAndInsert(blob);
    });
    log('paste handler wired');
  }

  // ────────────────── upload core ──────────────────

  async function uploadAndInsert(blob) {
    const key = getKey();
    const textarea = document.getElementById('chatbox__messages-create');
    if (!textarea) return;

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
      const r = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`,
        { method: 'POST', body: fd }
      );
      const j = await r.json();
      if (!j.success || !j.data?.url) {
        throw new Error(j.error?.message || `HTTP ${r.status}`);
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

  log('loaded (settings:', location.pathname, ')');
})();

(function () {
  'use strict';
  const { color, layouts, presets, changelog, bom, kle, renderKeyboard } = window.KC;
  const shareCodec = window.KC.share;
  // Not destructured as `history`: that name is the browser's window.history (used for the URL hash).
  const undoStack = window.KC.history.createHistory();

  const GROUPS = ['alpha', 'mod', 'accent'];
  const GROUP_LABELS = { alpha: 'アルファ', mod: 'モディファイア', accent: 'アクセント' };

  const state = {
    layoutId: '65',
    std: 'ansi', // preferred key standard for layouts that have a JIS variant
    source: 'harmony',
    base: '#5e81ac',
    harmony: 'complementary',
    tone: 'light',
    presetId: null,
    autoLegend: true,
    colors: null, // { case, alpha: { cap, legend }, mod: {...}, accent: {...} }
    overrides: {}, // { [layoutId]: { [keyId]: capHex } }
    tool: '', // what clicking a key does: '' (nothing), 'paint', or a group id to move it to
    groups: {}, // { [layoutId]: { [keyId]: group } } keys moved to another color group
    paint: '#e4572e',
    cvd: '', // colour vision simulation for the preview only ('' = off)
    imported: null, // layout imported from KLE: { name, keys } (shown as layout id 'kle')
    // Colors the 「ランダム」 button keeps. A view preference: not in undo, share URLs or saves.
    locks: { case: false, alpha: false, mod: false, accent: false },
  };

  // State that undo / redo and saved designs restore. View-only settings (paint mode,
  // simulation) are left out on purpose.
  const UNDOABLE = ['layoutId', 'std', 'source', 'base', 'harmony', 'tone', 'presetId', 'autoLegend', 'colors', 'overrides', 'imported', 'groups'];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // The imported KLE layout is rebuilt only when state.imported changes (undo replaces the object).
  let builtFrom = null;
  let builtLayout = null;

  function currentLayout() {
    if (state.layoutId === 'kle' && state.imported) {
      if (builtFrom !== state.imported) {
        builtFrom = state.imported;
        builtLayout = layouts.buildLayout({
          id: 'kle',
          name: state.imported.name || '読み込んだレイアウト',
          desc: `keyboard-layout-editor から読み込んだレイアウト（${state.imported.keys.length}キー）。`,
          keys: state.imported.keys,
        });
      }
      return builtLayout;
    }
    return layouts.byId[state.layoutId] || layouts.byId['65'];
  }

  function applyRoles(roles) {
    state.colors = { case: roles.case };
    for (const g of GROUPS) state.colors[g] = { cap: roles[g], legend: color.autoLegend(roles[g]) };
  }

  function legendFor(group) {
    const c = state.colors[group];
    return state.autoLegend ? color.autoLegend(c.cap) : c.legend;
  }

  function layoutOverrides() {
    return (state.overrides[state.layoutId] ||= {});
  }

  function layoutGroups() {
    return (state.groups[state.layoutId] ||= {});
  }

  // A key's color group: the user's reassignment, else the one inferred from its legend.
  function groupOf(key) {
    return layoutGroups()[key.id] || key.g;
  }

  function colorsFor(key) {
    const cap = layoutOverrides()[key.id];
    if (cap) return { cap, legend: color.autoLegend(cap) };
    const g = groupOf(key);
    return { cap: state.colors[g].cap, legend: legendFor(g) };
  }

  const TOOL_ACTIONS = { paint: '塗る', alpha: 'アルファにする', mod: 'モディファイアにする', accent: 'アクセントにする' };

  // Actual colors: used for PNG export and the keycap breakdown.
  function currentSvg() {
    return renderKeyboard(currentLayout(), state.colors.case, colorsFor);
  }

  // What the preview shows: colors passed through the selected vision simulation.
  function previewSvg() {
    const sim = (hex) => (state.cvd ? color.simulateCvd(hex, state.cvd) : hex);
    const simColorsFor = (key) => {
      const { cap, legend } = colorsFor(key);
      return { cap: sim(cap), legend: sim(legend) };
    };
    return renderKeyboard(currentLayout(), sim(state.colors.case), simColorsFor, { interactive: TOOL_ACTIONS[state.tool] || false });
  }

  // ---------- rendering ----------

  function renderPreview() {
    $('preview').innerHTML = previewSvg();
    $('preview').classList.toggle('painting', Boolean(state.tool));
    $('cvd-note').hidden = !state.cvd;
    renderBom();
  }

  function currentBom() {
    return bom.computeBom(currentLayout().keys, colorsFor);
  }

  function renderBom() {
    $('bom').innerHTML = currentBom()
      .map(
        (g) =>
          `<li><span class="bom-swatch" style="background:${g.cap};color:${g.legend}">A</span>` +
          `<span class="bom-color"><code>${g.cap}</code><small>刻印 ${g.legend}</small></span>` +
          `<span class="bom-total">${g.total}個</span>` +
          `<span class="bom-sizes">${g.sizes.map((s) => `${s.size}×${s.count}`).join(' / ')}</span></li>`
      )
      .join('');
  }

  function layoutTitle(layout) {
    return layout.std === 'jis' ? `${layout.name}（JIS）` : layout.name;
  }

  function renderRatio() {
    const keys = currentLayout().keys;
    const counts = { alpha: 0, mod: 0, accent: 0 };
    for (const key of keys) counts[groupOf(key)]++;
    $('ratio').innerHTML =
      `<span class="ratio-total">${keys.length}キー</span>` +
      GROUPS.map((g) => {
        const pct = Math.round((counts[g] / keys.length) * 100);
        return `<span class="ratio-item"><i style="background:${state.colors[g].cap}"></i>${GROUP_LABELS[g]} ${pct}%</span>`;
      }).join('');
  }

  function renderLayouts() {
    $('layouts').innerHTML = layouts.CATEGORIES.map(
      (cat) =>
        `<h3 class="layout-cat">${cat.name}</h3><div class="layout-grid">` +
        layouts.list
          .filter((l) => l.cat === cat.id && !l.variantOf)
          .map(
            (l) =>
              `<button type="button" class="layout-btn" data-id="${l.id}" aria-pressed="${l.id === baseLayout().id}">` +
              `<span class="layout-name">${l.name}${l.example ? `<small>例: ${l.example}</small>` : ''}</span>` +
              `${l.tag ? `<small class="layout-tag">${l.tag}</small>` : ''}</button>`
          )
          .join('') +
        `</div>`
    ).join('') + importedLayoutButton();
    $('layout-desc').textContent = currentLayout().desc;
    const hasJis = Boolean(baseLayout().jis);
    const std = currentLayout().std || 'ansi';
    for (const btn of $('std-toggle').querySelectorAll('button')) {
      btn.disabled = !hasJis;
      btn.setAttribute('aria-pressed', btn.dataset.std === std);
    }
    $('std-note').hidden = hasJis;
  }

  function importedLayoutButton() {
    if (!state.imported) return '';
    const name = esc(state.imported.name || '読み込んだレイアウト');
    return (
      `<h3 class="layout-cat">読み込んだレイアウト</h3><div class="layout-grid">` +
      `<button type="button" class="layout-btn" data-id="kle" aria-pressed="${state.layoutId === 'kle'}">` +
      `<span class="layout-name">${name}<small>${state.imported.keys.length}キー（KLE）</small></span></button></div>`
    );
  }

  function baseLayout() {
    const layout = currentLayout();
    return layout.variantOf ? layouts.byId[layout.variantOf] : layout;
  }

  // Pick the variant of a base layout that matches the preferred key standard.
  function selectLayout(baseId) {
    if (baseId === 'kle') {
      state.layoutId = 'kle';
      return;
    }
    const base = layouts.byId[baseId];
    state.layoutId = state.std === 'jis' && base.jis ? base.jis : baseId;
  }

  function renderSource() {
    const harmony = state.source !== 'preset';
    $('tab-harmony').setAttribute('aria-selected', harmony);
    $('tab-preset').setAttribute('aria-selected', !harmony);
    $('pane-harmony').hidden = !harmony;
    $('pane-preset').hidden = harmony;
    $('base').value = state.base;
    $('harmony').value = state.harmony;
    $('tone').value = state.tone;
    $('harmony-desc').textContent = color.HARMONIES[state.harmony].desc;
    $('source-note').hidden = state.source !== 'custom';
    for (const btn of $('presets').querySelectorAll('.preset')) {
      btn.setAttribute('aria-pressed', state.source === 'preset' && btn.dataset.id === state.presetId);
    }
  }

  function contrastBadge(cap, legend) {
    const ratio = color.contrastRatio(cap, legend);
    const level = color.wcagLevel(ratio);
    return `<span class="badge ${level === 'NG' ? 'bad' : ''}" title="刻印とキーキャップのコントラスト比">${ratio.toFixed(1)}:1 ${level}</span>`;
  }

  function lockButton(role, label) {
    const locked = state.locks[role];
    return (
      `<button type="button" class="lock" data-lock="${role}" aria-pressed="${locked}" ` +
      `aria-label="${label}の色をランダムで変えない" title="${locked ? 'ランダムでも変えない（固定中）' : 'ランダムで変わる'}">${locked ? '🔒' : '🔓'}</button>`
    );
  }

  function renderTuning() {
    const rows = [
      `<div class="tune-row"><span class="tune-label">ケース</span>` +
        `<input type="color" data-role="case" value="${state.colors.case}" aria-label="ケースの色">` +
        lockButton('case', 'ケース') +
        `</div>`,
      ...GROUPS.map((g) => {
        const cap = state.colors[g].cap;
        const legend = legendFor(g);
        return (
          `<div class="tune-row"><span class="tune-label">${GROUP_LABELS[g]}</span>` +
          `<input type="color" data-role="${g}" data-part="cap" value="${cap}" aria-label="${GROUP_LABELS[g]}のキーキャップ色">` +
          `<input type="color" data-role="${g}" data-part="legend" value="${legend}" aria-label="${GROUP_LABELS[g]}の刻印色" ${state.autoLegend ? 'disabled' : ''}>` +
          contrastBadge(cap, legend) +
          lockButton(g, GROUP_LABELS[g]) +
          `</div>`
        );
      }),
    ];
    $('tuning').innerHTML = rows.join('');
    $('auto-legend').checked = state.autoLegend;
  }

  function renderAll() {
    renderLayouts();
    renderSource();
    renderTuning();
    renderPreview();
    renderRatio();
    renderUndo();
    saveHash();
  }

  // ---------- undo / redo ----------

  function snapshot() {
    return JSON.parse(JSON.stringify(Object.fromEntries(UNDOABLE.map((k) => [k, state[k]]))));
  }

  // Record the state before a change. Changes of the same `kind` in quick succession
  // (dragging a color picker) become one undo step.
  function checkpoint(kind = null) {
    undoStack.checkpoint(snapshot(), kind);
    renderUndo();
  }

  function undo() {
    const snap = undoStack.undo(snapshot());
    if (!snap) return;
    Object.assign(state, snap);
    renderAll();
  }

  function redo() {
    const snap = undoStack.redo(snapshot());
    if (!snap) return;
    Object.assign(state, snap);
    renderAll();
  }

  function renderUndo() {
    $('btn-undo').disabled = !undoStack.canUndo();
    $('btn-redo').disabled = !undoStack.canRedo();
  }

  // ---------- palette sources ----------

  function generate() {
    state.source = 'harmony';
    applyRoles(color.generatePalette(state.base, state.harmony, state.tone));
    renderAll();
  }

  function usePreset(id) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    state.source = 'preset';
    state.presetId = id;
    applyRoles(preset.colors);
    renderAll();
  }

  const lockedRoles = () => Object.keys(state.locks).filter((role) => state.locks[role]);
  const allLocked = () => lockedRoles().length === Object.keys(state.locks).length;

  // New random palette; locked roles keep their current cap (and legend) colors.
  function randomize() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const kept = JSON.parse(JSON.stringify(state.colors));
    state.base = color.hslToHex({ h: Math.random() * 360, s: 45 + Math.random() * 35, l: 50 });
    state.harmony = pick(Object.keys(color.HARMONIES));
    state.tone = pick(Object.keys(color.TONES));
    state.source = 'harmony';
    applyRoles(color.generatePalette(state.base, state.harmony, state.tone));
    const locked = lockedRoles();
    for (const role of locked) state.colors[role] = kept[role];
    // Locked colors are not part of the generated palette, so it is no longer a pure rule result.
    if (locked.length) state.source = 'custom';
    renderAll();
  }

  // ---------- share / export ----------

  // Compact form used by share URLs and saved designs.
  function shareData() {
    return {
      l: state.layoutId,
      c: state.colors,
      a: state.autoLegend,
      o: layoutOverrides(),
      gr: layoutGroups(),
      s: { src: state.source, b: state.base, h: state.harmony, t: state.tone, p: state.presetId },
      ...(state.layoutId === 'kle' && state.imported ? { k: kle.pack(state.imported) } : {}),
    };
  }

  // The hash is compressed asynchronously (js/share.js). Writes can finish out of order, so
  // only the most recent one may update the URL. `shareCodec.pending` lets tests (and share())
  // wait for the URL to catch up with the state.
  let hashSeq = 0;

  function saveHash() {
    const seq = ++hashSeq;
    shareCodec.pending = shareCodec.encode(shareData()).then((hash) => {
      if (seq === hashSeq) history.replaceState(null, '', `#${hash}`);
    });
    return shareCodec.pending;
  }

  async function loadHash() {
    if (location.hash.length < 2) return false;
    try {
      if (applyShared(await shareCodec.decode(location.hash.slice(1)))) return true;
    } catch {
      // fall through
    }
    toast('共有URLを読み込めませんでした。初期状態で開きます');
    return false;
  }

  // Validate and apply shareData(). Returns false (leaving state untouched) when invalid.
  function applyShared(data) {
    try {
      const imported = data.l === 'kle' ? kle.unpack(data.k) : null; // throws on bad data
      const layoutId = imported ? 'kle' : layouts.resolveId(data.l);
      if (!layoutId || !color.isHex(data.c.case)) return false;
      for (const g of GROUPS) {
        if (!color.isHex(data.c[g].cap) || !color.isHex(data.c[g].legend)) return false;
      }
      const overrides = {};
      for (const [id, hex] of Object.entries(data.o || {})) if (color.isHex(hex)) overrides[id] = hex;
      state.layoutId = layoutId;
      if (imported) state.imported = imported;
      state.std = currentLayout().std || 'ansi';
      state.colors = data.c;
      state.autoLegend = data.a !== false;
      state.overrides[layoutId] = overrides;
      const keyCount = currentLayout().keys.length;
      const groups = {};
      for (const [id, g] of Object.entries(data.gr || {})) {
        if (/^\d+$/.test(id) && Number(id) < keyCount && GROUPS.includes(g)) groups[id] = g;
      }
      state.groups[layoutId] = groups;
      restoreSource(data.s);
      return true;
    } catch {
      return false;
    }
  }

  // Restore the palette-source controls saved in a share URL. URLs made before these
  // were saved (or with invalid values) fall back to 'custom'.
  function restoreSource(s) {
    state.source = 'custom';
    if (!s) return;
    if (color.isHex(s.b)) state.base = s.b;
    if (color.HARMONIES[s.h]) state.harmony = s.h;
    if (color.TONES[s.t]) state.tone = s.t;
    if (presets.some((p) => p.id === s.p)) state.presetId = s.p;
    if (s.src === 'harmony' || (s.src === 'preset' && state.presetId === s.p)) state.source = s.src;
  }

  async function copyBom() {
    const text = bom.bomText(currentBom(), `${layoutTitle(currentLayout())} のキーキャップ内訳`);
    try {
      await navigator.clipboard.writeText(text);
      toast('キーキャップ内訳をコピーしました');
    } catch {
      window.prompt('この内容をコピーしてください', text);
    }
  }

  // ---------- KLE import ----------

  function importKle() {
    $('kle-error').textContent = '';
    let parsed;
    try {
      parsed = kle.parseKle($('kle-text').value);
    } catch (e) {
      $('kle-error').textContent = e instanceof kle.KleError ? e.message : 'JSON を読み込めませんでした。';
      return;
    }
    checkpoint();
    const overrides = {};
    if ($('kle-colors').checked) {
      parsed.keys.forEach((k, i) => {
        if (k.c) overrides[String(i)] = color.rgbToHex(color.hexToRgb(k.c));
      });
    }
    state.imported = { name: parsed.name, keys: parsed.keys.map(({ c, ...key }) => key) };
    state.layoutId = 'kle';
    state.overrides.kle = overrides;
    renderAll();
    toast(`${parsed.keys.length}キーのレイアウトを読み込みました`);
  }

  function kleRows() {
    return kle.serialize(currentLayout(), {
      name: layoutTitle(currentLayout()),
      caseColor: state.colors.case,
      colorsFor,
    });
  }

  function exportKleRaw() {
    $('kle-out').value = kle.toRawData(kleRows());
    $('kle-out-wrap').hidden = false;
    $('kle-out').select();
    toast('KLE の Raw data を作りました');
  }

  async function copyKleRaw() {
    try {
      await navigator.clipboard.writeText($('kle-out').value);
      toast('Raw data をコピーしました');
    } catch {
      $('kle-out').select();
      toast('コピーできませんでした。選択された文字列を手動でコピーしてください');
    }
  }

  function exportKleJson() {
    const blob = new Blob([kle.toJson(kleRows())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `keyboard-${state.layoutId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- saved designs (this browser only) ----------

  const SAVE_KEY = 'keyboard-color:saved';
  const SAVE_LIMIT = 30;

  function readSaved() {
    try {
      const list = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeSaved(list) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(list));
      return true;
    } catch {
      return false;
    }
  }

  function saveCurrent() {
    const list = readSaved();
    if (list.length >= SAVE_LIMIT) {
      toast(`保存できるのは${SAVE_LIMIT}件までです。不要なものを削除してください`);
      return;
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getMonth() + 1}/${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    list.unshift({
      id: `${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: `${layoutTitle(currentLayout())} ${stamp}`,
      data: JSON.parse(JSON.stringify(shareData())),
    });
    if (writeSaved(list)) {
      toast('この配色を保存しました');
      renderSaved();
    } else {
      toast('このブラウザでは保存できませんでした（プライベートモードなど）');
    }
  }

  function renderSaved() {
    const list = readSaved();
    $('saved').innerHTML = list.length
      ? list
          .map((item) => {
            const c = item.data && item.data.c;
            const swatches = c
              ? [c.case, c.alpha && c.alpha.cap, c.mod && c.mod.cap, c.accent && c.accent.cap]
                  .filter(color.isHex)
                  .map((hex) => `<i style="background:${hex}"></i>`)
                  .join('')
              : '';
            const name = String(item.name).replace(/[&<>"]/g, '');
            return (
              `<li data-id="${String(item.id).replace(/[^a-z0-9]/gi, '')}"><span class="swatches">${swatches}</span>` +
              `<span class="saved-name">${name}</span>` +
              `<button type="button" data-action="open">開く</button>` +
              `<button type="button" data-action="delete" aria-label="${name} を削除">削除</button></li>`
            );
          })
          .join('')
      : '<li class="saved-empty">まだ保存した配色はありません。</li>';
  }

  function onSavedClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('li').dataset.id;
    const list = readSaved();
    const item = list.find((x) => String(x.id).replace(/[^a-z0-9]/gi, '') === id);
    if (!item) return;
    if (btn.dataset.action === 'open') {
      const before = snapshot();
      if (applyShared(item.data)) {
        undoStack.checkpoint(before);
        renderAll();
        toast(`「${item.name}」を開きました`);
      } else {
        toast('この保存データは読み込めませんでした');
      }
    } else {
      writeSaved(list.filter((x) => x !== item));
      renderSaved();
      toast(`「${item.name}」を削除しました`);
    }
  }

  let toastTimer;
  function toast(message) {
    $('toast').textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').textContent = ''), 2500);
  }

  async function share() {
    await saveHash();
    try {
      await navigator.clipboard.writeText(location.href);
      toast('共有URLをコピーしました');
    } catch {
      window.prompt('このURLをコピーしてください', location.href);
    }
  }

  function exportPng() {
    const svg = currentSvg();
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `keyboard-${state.layoutId}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast('PNGの書き出しに失敗しました');
    };
    img.src = url;
  }

  function renderCredits() {
    const credits = new Map(presets.filter((p) => p.credit).map((p) => [p.credit.name, p.credit]));
    $('credits-list').innerHTML = [...credits.values()]
      .map((c) => `<li><a href="${c.url}" rel="noopener">${c.name}</a> — ${c.copyright}, ${c.license} License</li>`)
      .join('');
  }

  const CHANGELOG_VISIBLE = 3;

  function renderChangelog() {
    const entry = (e) =>
      `<li><time datetime="${e.date}">${e.date}</time><strong>${e.title}</strong>` +
      `<ul>${e.items.map((item) => `<li>${item}</li>`).join('')}</ul></li>`;
    const recent = changelog.slice(0, CHANGELOG_VISIBLE);
    const older = changelog.slice(CHANGELOG_VISIBLE);
    $('changelog').innerHTML =
      `<ol class="changelog-list">${recent.map(entry).join('')}</ol>` +
      (older.length
        ? `<details><summary>以前の更新（${older.length}件）</summary><ol class="changelog-list">${older.map(entry).join('')}</ol></details>`
        : '');
  }

  // ---------- events ----------

  function bind() {
    $('layouts').addEventListener('click', (e) => {
      const btn = e.target.closest('.layout-btn');
      if (!btn) return;
      checkpoint();
      selectLayout(btn.dataset.id);
      renderAll();
    });

    $('std-toggle').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-std]');
      if (!btn || btn.disabled) return;
      checkpoint();
      state.std = btn.dataset.std;
      selectLayout(baseLayout().id);
      renderAll();
    });

    $('btn-bom-copy').addEventListener('click', copyBom);

    $('tab-harmony').addEventListener('click', () => {
      checkpoint();
      generate();
    });
    $('tab-preset').addEventListener('click', () => {
      checkpoint();
      usePreset(state.presetId || presets[0].id);
    });

    $('base').addEventListener('input', (e) => {
      checkpoint('base');
      state.base = e.target.value;
      generate();
    });
    $('harmony').addEventListener('change', (e) => {
      checkpoint();
      state.harmony = e.target.value;
      generate();
    });
    $('tone').addEventListener('change', (e) => {
      checkpoint();
      state.tone = e.target.value;
      generate();
    });

    $('presets').addEventListener('click', (e) => {
      const btn = e.target.closest('.preset');
      if (!btn) return;
      checkpoint();
      usePreset(btn.dataset.id);
    });

    $('tuning').addEventListener('input', (e) => {
      const { role, part } = e.target.dataset;
      if (!role) return;
      checkpoint(`tune:${role}:${part || ''}`);
      if (role === 'case') state.colors.case = e.target.value;
      else state.colors[role][part] = e.target.value;
      state.source = 'custom';
      renderSource();
      renderPreview();
      renderRatio();
      renderUndo();
      saveHash();
      // Refresh the contrast badges without rebuilding the input being dragged.
      const badges = $('tuning').querySelectorAll('.badge');
      GROUPS.forEach((g, i) => (badges[i].outerHTML = contrastBadge(state.colors[g].cap, legendFor(g))));
      if (state.autoLegend && part === 'cap') {
        $('tuning').querySelector(`[data-role="${role}"][data-part="legend"]`).value = legendFor(role);
      }
    });

    $('auto-legend').addEventListener('change', (e) => {
      checkpoint();
      if (!e.target.checked) for (const g of GROUPS) state.colors[g].legend = legendFor(g);
      state.autoLegend = e.target.checked;
      renderAll();
    });

    $('key-tool').addEventListener('change', (e) => {
      state.tool = e.target.value;
      $('paint-row').hidden = state.tool !== 'paint';
      renderPreview();
    });
    $('paint').addEventListener('input', (e) => (state.paint = e.target.value));

    // Apply the selected tool to one key, then keep keyboard focus on it across the re-render.
    // Repeating the same action on a key undoes it.
    function applyTool(id) {
      const key = currentLayout().keys.find((k) => k.id === id);
      if (!key) return;
      if (state.tool === 'paint') {
        checkpoint();
        const overrides = layoutOverrides();
        if (overrides[id] === state.paint) delete overrides[id];
        else overrides[id] = state.paint;
      } else if (GROUPS.includes(state.tool)) {
        const groups = layoutGroups();
        const next = groupOf(key) === state.tool ? key.g : state.tool;
        if (next === groupOf(key)) return; // already in that group by default
        checkpoint();
        if (next === key.g) delete groups[id];
        else groups[id] = next;
        renderRatio();
      } else {
        return;
      }
      renderPreview();
      saveHash();
      const again = $('preview').querySelector(`.key[data-id="${id}"]`);
      if (again && again.matches('[tabindex]')) again.focus();
    }

    $('preview').addEventListener('click', (e) => {
      const keyEl = e.target.closest('.key');
      if (keyEl) applyTool(keyEl.dataset.id);
    });

    $('preview').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const keyEl = e.target.closest('.key[tabindex]');
      if (!keyEl) return;
      e.preventDefault();
      applyTool(keyEl.dataset.id);
    });

    $('btn-clear').addEventListener('click', () => {
      if (!Object.keys(layoutOverrides()).length && !Object.keys(layoutGroups()).length) return;
      checkpoint();
      state.overrides[state.layoutId] = {};
      state.groups[state.layoutId] = {};
      renderPreview();
      renderRatio();
      saveHash();
    });

    $('cvd').addEventListener('change', (e) => {
      state.cvd = e.target.value;
      renderPreview();
    });

    $('btn-undo').addEventListener('click', undo);
    $('btn-redo').addEventListener('click', redo);
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) undo();
      else if ((key === 'z' && e.shiftKey) || key === 'y') redo();
      else return;
      e.preventDefault();
    });

    $('btn-save').addEventListener('click', saveCurrent);

    $('btn-kle').addEventListener('click', importKle);
    $('btn-kle-raw').addEventListener('click', exportKleRaw);
    $('btn-kle-copy').addEventListener('click', copyKleRaw);
    $('btn-kle-json').addEventListener('click', exportKleJson);
    $('kle-file').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        $('kle-error').textContent = 'ファイルが大きすぎます（1MBまで）。';
        return;
      }
      $('kle-text').value = await file.text();
      e.target.value = '';
      importKle();
    });
    $('saved').addEventListener('click', onSavedClick);
    $('btn-random').addEventListener('click', () => {
      if (allLocked()) {
        toast('すべての色が固定されています。🔒 を押して解除してください');
        return;
      }
      checkpoint();
      randomize();
    });

    $('tuning').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lock]');
      if (!btn) return;
      state.locks[btn.dataset.lock] = !state.locks[btn.dataset.lock];
      renderTuning();
      $('tuning').querySelector(`[data-lock="${btn.dataset.lock}"]`).focus();
    });
    $('btn-share').addEventListener('click', share);
    $('btn-png').addEventListener('click', exportPng);
  }

  async function init() {
    $('harmony').innerHTML = Object.entries(color.HARMONIES)
      .map(([id, h]) => `<option value="${id}">${h.label}</option>`)
      .join('');
    $('tone').innerHTML = Object.entries(color.TONES)
      .map(([id, t]) => `<option value="${id}">${t.label}</option>`)
      .join('');
    $('presets').innerHTML = presets
      .map(
        (p) =>
          `<button type="button" class="preset" data-id="${p.id}" title="${p.desc}">` +
          `<span class="swatches">${['case', 'alpha', 'mod', 'accent'].map((r) => `<i style="background:${p.colors[r]}"></i>`).join('')}</span>` +
          `<span class="preset-name">${p.name}</span><span class="preset-desc">${p.desc}</span></button>`
      )
      .join('');
    $('paint').value = state.paint;
    $('cvd').innerHTML =
      '<option value="">通常の色</option>' +
      Object.entries(color.CVD)
        .map(([id, c]) => `<option value="${id}">${c.label}</option>`)
        .join('');
    renderCredits();
    renderSaved();
    renderChangelog();

    bind();
    if (await loadHash()) renderAll();
    else generate();
    await shareCodec.pending;
    document.documentElement.dataset.ready = 'true';
  }

  init();
})();

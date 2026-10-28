(function () {
  'use strict';
  const { color, layouts, presets, renderKeyboard } = window.KC;

  const GROUPS = ['alpha', 'mod', 'accent'];
  const GROUP_LABELS = { alpha: 'アルファ', mod: 'モディファイア', accent: 'アクセント' };

  const state = {
    layoutId: '65',
    source: 'harmony',
    base: '#5e81ac',
    harmony: 'complementary',
    tone: 'light',
    presetId: null,
    autoLegend: true,
    colors: null, // { case, alpha: { cap, legend }, mod: {...}, accent: {...} }
    overrides: {}, // { [layoutId]: { [keyId]: capHex } }
    paintMode: false,
    paint: '#e4572e',
  };

  const $ = (id) => document.getElementById(id);

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

  function colorsFor(key) {
    const cap = layoutOverrides()[key.id];
    if (cap) return { cap, legend: color.autoLegend(cap) };
    return { cap: state.colors[key.g].cap, legend: legendFor(key.g) };
  }

  function currentSvg() {
    return renderKeyboard(layouts.byId[state.layoutId], state.colors.case, colorsFor);
  }

  // ---------- rendering ----------

  function renderPreview() {
    $('preview').innerHTML = currentSvg();
    $('preview').classList.toggle('painting', state.paintMode);
  }

  function renderRatio() {
    const keys = layouts.byId[state.layoutId].keys;
    const counts = { alpha: 0, mod: 0, accent: 0 };
    for (const key of keys) counts[key.g]++;
    $('ratio').innerHTML =
      `<span class="ratio-total">${keys.length}キー</span>` +
      GROUPS.map((g) => {
        const pct = Math.round((counts[g] / keys.length) * 100);
        return `<span class="ratio-item"><i style="background:${state.colors[g].cap}"></i>${GROUP_LABELS[g]} ${pct}%</span>`;
      }).join('');
  }

  function renderLayouts() {
    $('layouts').innerHTML = layouts.list
      .map(
        (l) =>
          `<button type="button" class="layout-btn" data-id="${l.id}" aria-pressed="${l.id === state.layoutId}">` +
          `<span>${l.name}</span>${l.tag ? `<small>${l.tag}</small>` : ''}</button>`
      )
      .join('');
    $('layout-desc').textContent = layouts.byId[state.layoutId].desc;
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
    for (const btn of $('presets').querySelectorAll('.preset')) {
      btn.setAttribute('aria-pressed', state.source === 'preset' && btn.dataset.id === state.presetId);
    }
  }

  function contrastBadge(cap, legend) {
    const ratio = color.contrastRatio(cap, legend);
    const level = color.wcagLevel(ratio);
    return `<span class="badge ${level === 'NG' ? 'bad' : ''}" title="刻印とキーキャップのコントラスト比">${ratio.toFixed(1)}:1 ${level}</span>`;
  }

  function renderTuning() {
    const rows = [
      `<div class="tune-row"><span class="tune-label">ケース</span>` +
        `<input type="color" data-role="case" value="${state.colors.case}" aria-label="ケースの色"></div>`,
      ...GROUPS.map((g) => {
        const cap = state.colors[g].cap;
        const legend = legendFor(g);
        return (
          `<div class="tune-row"><span class="tune-label">${GROUP_LABELS[g]}</span>` +
          `<input type="color" data-role="${g}" data-part="cap" value="${cap}" aria-label="${GROUP_LABELS[g]}のキーキャップ色">` +
          `<input type="color" data-role="${g}" data-part="legend" value="${legend}" aria-label="${GROUP_LABELS[g]}の刻印色" ${state.autoLegend ? 'disabled' : ''}>` +
          contrastBadge(cap, legend) +
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
    saveHash();
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

  function randomize() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    state.base = color.hslToHex({ h: Math.random() * 360, s: 45 + Math.random() * 35, l: 50 });
    state.harmony = pick(Object.keys(color.HARMONIES));
    state.tone = pick(Object.keys(color.TONES));
    generate();
  }

  // ---------- share / export ----------

  function encodeState() {
    const data = { l: state.layoutId, c: state.colors, a: state.autoLegend, o: layoutOverrides() };
    return btoa(JSON.stringify(data));
  }

  function saveHash() {
    history.replaceState(null, '', `#${encodeState()}`);
  }

  function loadHash() {
    if (location.hash.length < 2) return false;
    try {
      const data = JSON.parse(atob(location.hash.slice(1)));
      if (!layouts.byId[data.l] || !color.isHex(data.c.case)) return false;
      for (const g of GROUPS) {
        if (!color.isHex(data.c[g].cap) || !color.isHex(data.c[g].legend)) return false;
      }
      const overrides = {};
      for (const [id, hex] of Object.entries(data.o || {})) if (color.isHex(hex)) overrides[id] = hex;
      state.layoutId = data.l;
      state.colors = data.c;
      state.autoLegend = data.a !== false;
      state.overrides[data.l] = overrides;
      state.source = 'custom';
      return true;
    } catch {
      return false;
    }
  }

  let toastTimer;
  function toast(message) {
    $('toast').textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($('toast').textContent = ''), 2500);
  }

  async function share() {
    saveHash();
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

  // ---------- events ----------

  function bind() {
    $('layouts').addEventListener('click', (e) => {
      const btn = e.target.closest('.layout-btn');
      if (!btn) return;
      state.layoutId = btn.dataset.id;
      renderAll();
    });

    $('tab-harmony').addEventListener('click', generate);
    $('tab-preset').addEventListener('click', () => usePreset(state.presetId || presets[0].id));

    $('base').addEventListener('input', (e) => {
      state.base = e.target.value;
      generate();
    });
    $('harmony').addEventListener('change', (e) => {
      state.harmony = e.target.value;
      generate();
    });
    $('tone').addEventListener('change', (e) => {
      state.tone = e.target.value;
      generate();
    });

    $('presets').addEventListener('click', (e) => {
      const btn = e.target.closest('.preset');
      if (btn) usePreset(btn.dataset.id);
    });

    $('tuning').addEventListener('input', (e) => {
      const { role, part } = e.target.dataset;
      if (!role) return;
      if (role === 'case') state.colors.case = e.target.value;
      else state.colors[role][part] = e.target.value;
      state.source = 'custom';
      renderSource();
      renderPreview();
      renderRatio();
      saveHash();
      // Refresh the contrast badges without rebuilding the input being dragged.
      const badges = $('tuning').querySelectorAll('.badge');
      GROUPS.forEach((g, i) => (badges[i].outerHTML = contrastBadge(state.colors[g].cap, legendFor(g))));
      if (state.autoLegend && part === 'cap') {
        $('tuning').querySelector(`[data-role="${role}"][data-part="legend"]`).value = legendFor(role);
      }
    });

    $('auto-legend').addEventListener('change', (e) => {
      if (!e.target.checked) for (const g of GROUPS) state.colors[g].legend = legendFor(g);
      state.autoLegend = e.target.checked;
      renderAll();
    });

    $('paint-mode').addEventListener('change', (e) => {
      state.paintMode = e.target.checked;
      renderPreview();
    });
    $('paint').addEventListener('input', (e) => (state.paint = e.target.value));

    $('preview').addEventListener('click', (e) => {
      if (!state.paintMode) return;
      const keyEl = e.target.closest('.key');
      if (!keyEl) return;
      const overrides = layoutOverrides();
      const id = keyEl.dataset.id;
      if (overrides[id] === state.paint) delete overrides[id];
      else overrides[id] = state.paint;
      renderPreview();
      saveHash();
    });

    $('btn-clear').addEventListener('click', () => {
      state.overrides[state.layoutId] = {};
      renderPreview();
      saveHash();
    });
    $('btn-random').addEventListener('click', randomize);
    $('btn-share').addEventListener('click', share);
    $('btn-png').addEventListener('click', exportPng);
  }

  function init() {
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

    bind();
    if (loadHash()) renderAll();
    else generate();
  }

  init();
})();

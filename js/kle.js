// Import and export layouts in keyboard-layout-editor.com (KLE) JSON / raw data.
// Independent implementation of the KLE layout format (see CLAUDE.md: no KLE editor code is copied).
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./layouts.js') : root.KC.layouts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { kle: api });
})(typeof self !== 'undefined' ? self : this, function (layouts) {
  'use strict';

  const MAX_KEYS = 500;
  const MAX_COORD = 200;
  const MAX_SIZE = 30;
  const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

  class KleError extends Error {}

  // KLE's "Raw data" tab is JSON5-like: bare object keys, optional single quotes,
  // trailing commas, and no outer brackets. Convert it to strict JSON without eval.
  function relaxedToJson(text) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '"' || ch === "'") {
        // Copy a string, normalising to double quotes.
        const quote = ch;
        let s = '"';
        i++;
        while (i < text.length && text[i] !== quote) {
          if (text[i] === '\\') {
            const next = text[i + 1];
            s += next === "'" ? "'" : `\\${next === undefined ? '\\' : next}`;
            i += 2;
            continue;
          }
          s += text[i] === '"' ? '\\"' : text[i] === '\n' ? '\\n' : text[i];
          i++;
        }
        out += `${s}"`;
        i++;
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        let ident = '';
        while (i < text.length && /[A-Za-z0-9_$]/.test(text[i])) ident += text[i++];
        let j = i;
        while (j < text.length && /\s/.test(text[j])) j++;
        out += text[j] === ':' ? `"${ident}"` : ident;
        continue;
      }
      if (ch === ',') {
        let j = i + 1;
        while (j < text.length && /\s/.test(text[j])) j++;
        if (text[j] === ']' || text[j] === '}') {
          i++;
          continue;
        }
      }
      out += ch;
      i++;
    }
    return out;
  }

  // Returns the top-level array of rows (and optional leading metadata object).
  function toRows(text) {
    const src = String(text || '').trim();
    if (!src) throw new KleError('JSON が空です。');
    const json = relaxedToJson(src);
    for (const candidate of [json, `[${json}]`]) {
      let value;
      try {
        value = JSON.parse(candidate);
      } catch {
        continue;
      }
      if (!Array.isArray(value)) continue;
      // A single row (["Esc", "1", ...]) on its own.
      if (value.length && value.every((v) => typeof v === 'string' || isPlainObject(v)) && value.some((v) => typeof v === 'string')) {
        return [value];
      }
      if (value.every((v) => Array.isArray(v) || isPlainObject(v))) return value;
    }
    throw new KleError('JSON として読み取れませんでした。KLE の「Raw data」の内容、またはダウンロードした JSON を貼り付けてください。');
  }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function num(v, name) {
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new KleError(`数値でない「${name}」があります。`);
    return v;
  }

  // Strip KLE's HTML legends (icons, <br>) and decode common entities.
  function cleanLabel(s) {
    return String(s)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .trim();
  }

  // One display label per key. Shifted legends come first in KLE ("!\n1", "<\n,"), so the
  // last single-character legend is the unshifted base character; otherwise the first legend.
  function displayLabel(raw) {
    const parts = String(raw).split('\n').map(cleanLabel).filter(Boolean);
    const singles = parts.filter((p) => [...p].length === 1);
    let label = singles[singles.length - 1] || parts[0] || '';
    if (/^[a-z]$/.test(label)) label = label.toUpperCase();
    return [...label].slice(0, 10).join('');
  }

  function parseKle(text) {
    const rows = toRows(text);
    const keys = [];
    let name = '';
    const cur = { x: 0, y: 0, w: 1, h: 1, x2: 0, y2: 0, w2: 0, h2: 0, r: 0, rx: 0, ry: 0, c: null, decal: false, ghost: false };
    const cluster = { x: 0, y: 0 };

    rows.forEach((row, r) => {
      if (isPlainObject(row)) {
        if (r !== 0) throw new KleError('メタデータ（名前など）は先頭に置く必要があります。');
        // Kept verbatim (the UI escapes it); only legends get HTML stripped.
        if (typeof row.name === 'string') name = row.name.trim().slice(0, 60);
      } else {
        row.forEach((item, k) => {
          if (typeof item === 'string') {
            if (!cur.decal && !cur.ghost) keys.push(toKey(item, cur));
            if (keys.length > MAX_KEYS) throw new KleError(`キーが多すぎます（最大${MAX_KEYS}個）。`);
            cur.x += cur.w;
            cur.w = cur.h = 1;
            cur.x2 = cur.y2 = cur.w2 = cur.h2 = 0;
            cur.decal = false;
            return;
          }
          if (!isPlainObject(item)) throw new KleError('行の中に読み取れない値があります。');
          if (k !== 0 && (item.r != null || item.rx != null || item.ry != null)) {
            throw new KleError('回転（r / rx / ry）は行の先頭のキーにしか指定できません。');
          }
          if (item.r != null) cur.r = num(item.r, 'r');
          // Setting a rotation origin also moves the cursor to it (KLE editor behaviour).
          if (item.rx != null) {
            cur.rx = cluster.x = num(item.rx, 'rx');
            cur.x = cluster.x;
            cur.y = cluster.y;
          }
          if (item.ry != null) {
            cur.ry = cluster.y = num(item.ry, 'ry');
            cur.x = cluster.x;
            cur.y = cluster.y;
          }
          if (typeof item.c === 'string') cur.c = HEX_RE.test(item.c) ? item.c.toLowerCase() : null;
          if (item.x) cur.x += num(item.x, 'x');
          if (item.y) cur.y += num(item.y, 'y');
          if (item.w) cur.w = cur.w2 = num(item.w, 'w');
          if (item.h) cur.h = cur.h2 = num(item.h, 'h');
          if (item.x2) cur.x2 = num(item.x2, 'x2');
          if (item.y2) cur.y2 = num(item.y2, 'y2');
          if (item.w2) cur.w2 = num(item.w2, 'w2');
          if (item.h2) cur.h2 = num(item.h2, 'h2');
          if (item.d) cur.decal = true;
          if (item.g != null) cur.ghost = Boolean(item.g);
        });
        cur.y++;
      }
      cur.x = cur.rx;
    });

    if (!keys.length) throw new KleError('キーが1つも見つかりませんでした。');
    return { name, keys };
  }

  function toKey(raw, cur) {
    for (const [v, n] of [
      [cur.x, 'x'],
      [cur.y, 'y'],
      [cur.rx, 'rx'],
      [cur.ry, 'ry'],
    ]) {
      if (Math.abs(v) > MAX_COORD) throw new KleError(`座標「${n}」が範囲外です。`);
    }
    for (const [v, n] of [
      [cur.w, 'w'],
      [cur.h, 'h'],
    ]) {
      if (!(v > 0 && v <= MAX_SIZE)) throw new KleError(`キーの大きさ「${n}」が範囲外です。`);
    }
    const l = displayLabel(raw);
    const key = { l, x: cur.x, y: cur.y, w: cur.w, h: cur.h, g: layouts.inferGroup(l), part: 0 };
    const w2 = cur.w2 || cur.w;
    const h2 = cur.h2 || cur.h;
    // A second rectangle (ISO Enter, big-ass Enter, stepped shapes) when it differs from the main one.
    if (cur.x2 || cur.y2 || w2 !== cur.w || h2 !== cur.h) {
      if (!(w2 > 0 && w2 <= MAX_SIZE && h2 > 0 && h2 <= MAX_SIZE)) throw new KleError('キーの大きさ「w2 / h2」が範囲外です。');
      key.sub = { x: cur.x2, y: cur.y2, w: w2, h: h2 };
    }
    if (cur.r) Object.assign(key, { rot: cur.r, rx: cur.rx, ry: cur.ry });
    if (cur.c) key.c = cur.c;
    return key;
  }

  // ---- export ----

  const KLE_DEFAULT_CAP = '#cccccc';
  const KLE_DEFAULT_LEGEND = '#000000';
  // 6 decimals: enough for rotated layouts (whose origins are irrational after trimming),
  // while dropping floating-point noise such as 0.30000000000000004.
  const round6 = (v) => Math.round(v * 1e6) / 1e6;

  // KLE renders legends as HTML.
  function encodeLabel(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // KLE geometry of a key. Our L-shaped Enter (`shape: 'iso'`, anchored at its wide top row)
  // becomes KLE's form: the tall 1.25u part plus a 1.5u second rectangle shifted 0.25u left.
  function kleGeometry(key) {
    if (key.shape === 'iso') {
      return { x: key.x + 0.25, y: key.y, w: key.w - 0.25, h: key.h, sub: { x: -0.25, y: 0, w: key.w, h: 1 } };
    }
    return { x: key.x, y: key.y, w: key.w, h: key.h, sub: key.sub || null };
  }

  // Build KLE rows for a layout. This is the inverse of parseKle(): it replays the same
  // cursor rules (rows advance y by 1 and reset x to rx; setting rx/ry moves the cursor to
  // the rotation origin; w/h reset after each key; c/t colours are sticky).
  // colorsFor(key) -> { cap, legend }.
  function serialize(layout, { name = '', caseColor = null, colorsFor }) {
    const items = layout.keys.map((key) => {
      const { cap, legend } = colorsFor(key);
      return {
        ...kleGeometry(key),
        r: round6(key.rot || 0),
        rx: key.rot ? round6(key.rx) : 0,
        ry: key.rot ? round6(key.ry) : 0,
        l: key.l,
        cap,
        legend,
      };
    });
    const clusterId = (k) => `${k.r}|${k.rx}|${k.ry}`;
    const clusterOrder = [...new Set(items.map(clusterId))];
    items.sort(
      (a, b) => clusterOrder.indexOf(clusterId(a)) - clusterOrder.indexOf(clusterId(b)) || round6(a.y) - round6(b.y) || a.x - b.x
    );

    const meta = { backcolor: caseColor || undefined, name: name || undefined, notes: 'Keyboard Color Lab で作成' };
    const rows = [JSON.parse(JSON.stringify(meta))];
    const cur = { x: 0, y: 0, r: 0, rx: 0, ry: 0, c: KLE_DEFAULT_CAP, t: KLE_DEFAULT_LEGEND };
    let row = null;
    let rowKey = null;

    for (const k of items) {
      const key = `${clusterId(k)}|${round6(k.y)}`;
      const props = {};
      if (key !== rowKey) {
        if (row) {
          rows.push(row);
          cur.y += 1;
          cur.x = cur.rx;
        }
        row = [];
        rowKey = key;
        if (k.r !== cur.r) props.r = cur.r = k.r;
        if (k.rx !== cur.rx || k.ry !== cur.ry) {
          props.rx = cur.rx = k.rx;
          props.ry = cur.ry = k.ry;
          cur.x = k.rx;
          cur.y = k.ry;
        }
        const dy = round6(k.y - cur.y);
        if (dy) props.y = dy;
        cur.y += dy;
      }
      const dx = round6(k.x - cur.x);
      if (dx) props.x = dx;
      cur.x += dx;
      if (k.cap !== cur.c) props.c = cur.c = k.cap;
      if (k.legend !== cur.t) props.t = cur.t = k.legend;
      if (k.w !== 1) props.w = round6(k.w);
      if (k.h !== 1) props.h = round6(k.h);
      if (k.sub) {
        if (k.sub.x) props.x2 = round6(k.sub.x);
        if (k.sub.y) props.y2 = round6(k.sub.y);
        if (k.sub.w !== k.w) props.w2 = round6(k.sub.w);
        if (k.sub.h !== k.h) props.h2 = round6(k.sub.h);
      }
      if (Object.keys(props).length) row.push(props);
      row.push(encodeLabel(k.l));
      cur.x += round6(k.w);
    }
    if (row) rows.push(row);
    return rows;
  }

  // For KLE's "Upload JSON" (or "Download JSON" format).
  function toJson(rows) {
    return `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`;
  }

  // For KLE's "Raw data" tab, which adds the outer brackets itself.
  function toRawData(rows) {
    return rows.map((r) => JSON.stringify(r)).join(',\n');
  }

  // ---- compact form for share URLs and saved designs ----

  const GROUP_CODES = { alpha: 'a', mod: 'm', accent: 'x' };
  const CODE_GROUPS = { a: 'alpha', m: 'mod', x: 'accent' };
  const r4 = (v) => Math.round(v * 1e4) / 1e4;

  function pack(custom) {
    return {
      n: custom.name,
      k: custom.keys.map((k) => [
        k.l,
        r4(k.x),
        r4(k.y),
        r4(k.w),
        r4(k.h),
        GROUP_CODES[k.g],
        k.rot ? [r4(k.rot), r4(k.rx), r4(k.ry)] : 0,
        k.sub ? [r4(k.sub.x), r4(k.sub.y), r4(k.sub.w), r4(k.sub.h)] : 0,
      ]),
    };
  }

  // Validates untrusted data (from a URL or localStorage); throws KleError when invalid.
  function unpack(data) {
    if (!isPlainObject(data) || !Array.isArray(data.k) || !data.k.length || data.k.length > MAX_KEYS) {
      throw new KleError('レイアウトのデータが壊れています。');
    }
    const finite = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_COORD;
    const size = (v) => typeof v === 'number' && v > 0 && v <= MAX_SIZE;
    const keys = data.k.map((a) => {
      if (!Array.isArray(a) || typeof a[0] !== 'string' || a[0].length > 10) throw new KleError('レイアウトのデータが壊れています。');
      const [l, x, y, w, h, gc, rot, sub] = a;
      if (![x, y].every(finite) || ![w, h].every(size) || !CODE_GROUPS[gc]) throw new KleError('レイアウトのデータが壊れています。');
      const key = { l, x, y, w, h, g: CODE_GROUPS[gc], part: 0 };
      if (rot) {
        if (!Array.isArray(rot) || !rot.every(finite)) throw new KleError('レイアウトのデータが壊れています。');
        Object.assign(key, { rot: rot[0], rx: rot[1], ry: rot[2] });
      }
      if (sub) {
        if (!Array.isArray(sub) || ![sub[0], sub[1]].every(finite) || ![sub[2], sub[3]].every(size)) {
          throw new KleError('レイアウトのデータが壊れています。');
        }
        key.sub = { x: sub[0], y: sub[1], w: sub[2], h: sub[3] };
      }
      return key;
    });
    return { name: typeof data.n === 'string' ? data.n.slice(0, 60) : '', keys };
  }

  return { parseKle, serialize, toJson, toRawData, pack, unpack, relaxedToJson, KleError };
});

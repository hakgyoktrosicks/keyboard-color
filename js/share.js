// Share-URL codec. New URLs: "z." + base64url(deflate-raw(UTF-8 JSON)), built with the
// browser's CompressionStream. Old URLs (plain Base64 of the JSON, always starting with "ey"
// because the JSON starts with '{"') still decode.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KC = Object.assign(root.KC || {}, { share: api });
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PREFIX = 'z.';
  // Upper bound for decompressed data, so a crafted URL cannot expand into a huge payload.
  const MAX_BYTES = 1024 * 1024;

  const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

  function toBase64(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  const toBase64Url = (bytes) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  function fromBase64(s) {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  }

  function fromBase64Url(s) {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return fromBase64(b64);
  }

  // Run bytes through a (de)compression stream, stopping once the output exceeds `limit`.
  async function transform(bytes, stream, limit = Infinity) {
    const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('decompressed data too large');
      }
      chunks.push(value);
    }
    const out = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  async function encode(data) {
    const json = new TextEncoder().encode(JSON.stringify(data));
    // Browsers without CompressionStream fall back to the old (longer) format.
    if (!canCompress()) return toBase64(json);
    return PREFIX + toBase64Url(await transform(json, new CompressionStream('deflate-raw')));
  }

  // Throws on malformed input.
  async function decode(hash) {
    let bytes;
    if (hash.startsWith(PREFIX)) {
      if (!canCompress()) throw new Error('this browser cannot decompress share URLs');
      bytes = await transform(fromBase64Url(hash.slice(PREFIX.length)), new DecompressionStream('deflate-raw'), MAX_BYTES);
    } else {
      bytes = fromBase64(hash);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  return { encode, decode, PREFIX, MAX_BYTES };
});

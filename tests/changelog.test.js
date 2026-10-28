const test = require('node:test');
const assert = require('node:assert/strict');
const changelog = require('../js/changelog.js');

test('changelog entries are well formed', () => {
  assert.ok(changelog.length > 0);
  for (const e of changelog) {
    assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, e.title);
    assert.ok(!Number.isNaN(Date.parse(e.date)), `invalid date ${e.date}`);
    assert.ok(e.title, 'title is required');
    assert.ok(Array.isArray(e.items) && e.items.length > 0, `${e.title}: at least one item`);
  }
});

test('changelog is ordered newest first', () => {
  for (let i = 1; i < changelog.length; i++) {
    assert.ok(changelog[i - 1].date >= changelog[i].date, `${changelog[i - 1].title} should not be older than ${changelog[i].title}`);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import guide from '../guide.json';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

test('every guide item carries a real, non-future lastVerified date and a verify flag (PRD R10)', () => {
  const today = new Date().toISOString().slice(0, 10);
  const ids = new Set<string>();
  for (const section of guide.sections) {
    assert.ok(section.items.length > 0, `${section.id} has items`);
    for (const item of section.items) {
      assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
      ids.add(item.id);
      assert.match(item.lastVerified, ISO, `${item.id}.lastVerified`);
      assert.ok(item.lastVerified <= today, `${item.id} verified in the future`);
      assert.equal(item.verify, true, `${item.id} must be marked verify-on-portal`);
      assert.ok(item.label.en.trim() && item.value.en.trim(), `${item.id} has label and value`);
    }
  }
});

test('the guide links only to government portals', () => {
  for (const link of [guide.officialPortal.url, guide.statePortal.url]) {
    assert.match(link, /^https:\/\/(sarathi\.parivahan\.gov\.in|www\.aptransport\.org)\//);
  }
});

test('fees are stated as verify-on-portal, never as bare facts', () => {
  const fees = guide.sections.find((s) => s.id === 'fees');
  assert.ok(fees);
  assert.ok(fees.items.every((i) => i.verify && ISO.test(i.lastVerified)));
});

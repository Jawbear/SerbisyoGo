import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duplicateAccounts } from '../scripts/audit-accounts.mjs';

test('account audit catches case and whitespace duplicates while allowing shared first names', () => {
  const report = duplicateAccounts([
    { id: 'a', email: ' ONE@example.test ', full_name: ' Maria  Santos ' },
    { id: 'b', email: 'one@example.test', full_name: 'maria\tSantos' },
    { id: 'c', email: 'other@example.test', full_name: 'Maria Cruz' },
    { id: 'd', email: null, full_name: 'Deletion pending', status: 'deleting' },
    { id: 'e', email: null, full_name: 'Deletion pending', status: 'deleting' }
  ]);
  assert.deepEqual(report, {
    duplicateEmails: [{ value: 'one@example.test', ids: ['a', 'b'] }],
    duplicateFullNames: [{ value: 'maria santos', ids: ['a', 'b'] }]
  });
});

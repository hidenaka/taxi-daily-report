import { test } from 'node:test';
import assert from 'node:assert';
import { parseArgs, parseOverrides, mergeUsers } from '../scripts/admin-bulk-push.mjs';

test('parseArgs: --user / --display 必須、--paste/--override 任意', () => {
  const r = parseArgs(['--user', 'user_a', '--display', 'Aさん']);
  assert.equal(r.userId, 'user_a');
  assert.equal(r.displayName, 'Aさん');
  assert.equal(r.pastePath, 'data/paste-here.txt');
  assert.deepEqual(r.overrides, {});
  assert.equal(r.dryRun, false);
});

test('parseArgs: --user 不足はエラー', () => {
  assert.throws(() => parseArgs(['--display', 'X']), /--user/);
});

test('parseArgs: --display 不足はエラー', () => {
  assert.throws(() => parseArgs(['--user', 'user_a']), /--display/);
});

test('parseArgs: --user に invalid な ID はエラー', () => {
  assert.throws(() => parseArgs(['--user', 'User_A', '--display', 'X']), /invalid/i);
});

test('parseArgs: --override をJSON-likeに分解', () => {
  const r = parseArgs(['--user', 'user_a', '--display', 'A', '--override', '2026-01-20:premium,2025-10-08:japantaxi']);
  assert.deepEqual(r.overrides, { '2026-01-20': 'premium', '2025-10-08': 'japantaxi' });
});

test('parseOverrides: 単独関数として動作', () => {
  assert.deepEqual(parseOverrides(''), {});
  assert.deepEqual(parseOverrides('2026-01-20:premium'), { '2026-01-20': 'premium' });
  assert.deepEqual(parseOverrides('2026-01-20:premium,2025-10-08:japantaxi'),
    { '2026-01-20': 'premium', '2025-10-08': 'japantaxi' });
});

test('mergeUsers: {users:[...]} 形式に新規 user を append', () => {
  const existing = { users: [{ userId: 'user_self', displayName: '自分', active: true }] };
  const merged = mergeUsers(existing, { userId: 'user_a', displayName: 'A', active: true });
  assert.equal(merged.users.length, 2);
  assert.equal(merged.users[1].userId, 'user_a');
});

test('mergeUsers: 既存 userId は updateで displayName 更新', () => {
  const existing = { users: [{ userId: 'user_a', displayName: '旧名', active: true }] };
  const merged = mergeUsers(existing, { userId: 'user_a', displayName: '新名', active: true });
  assert.equal(merged.users.length, 1);
  assert.equal(merged.users[0].displayName, '新名');
});

test('mergeUsers: flat array(壊れた形式) も受け取って正しい形式で返す', () => {
  const existing = [{ userId: 'user_mm', displayName: 'mm', active: true }];
  const merged = mergeUsers(existing, { userId: 'user_a', displayName: 'A', active: true });
  assert.equal(Array.isArray(merged.users), true);
  assert.equal(merged.users.length, 2);
});

test('mergeUsers: existing が null(=ファイルなし)も対応', () => {
  const merged = mergeUsers(null, { userId: 'user_a', displayName: 'A', active: true });
  assert.deepEqual(merged, { users: [{ userId: 'user_a', displayName: 'A', active: true }] });
});

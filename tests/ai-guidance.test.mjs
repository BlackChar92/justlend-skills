import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const modules = JSON.parse(read('skills/_meta.json')).skills.map(({ id }) => id);

test('sTRX guidance uses the live delay and a separate claim after waiting', () => {
  const skill = read('skills/justlend-trx-staking/SKILL.md');
  assert.doesNotMatch(skill, /~14 day|14-day unbonding/);
  assert.match(skill, /unfreezeDelayDays/);
  assert.match(skill, /unknown, stop/);
  assert.match(skill, /confirm `claim_strx_rewards` separately/);
  assert.match(read('README.md'), /Do not call `unstake_strx` again/);
  assert.match(read('docs/strx-staking-guide.md'), /Unknown\/degraded data does not mean zero/);
});

test('V2 risk, health, quote and permissions are distinct checks', () => {
  for (const path of ['skills/justlend-lending-v2/SKILL.md', 'docs/justlend-v2-guide.md']) {
    const text = read(path).replace(/\s+/g, ' ');
    assert.match(text, /can exceed 1/);
    assert.doesNotMatch(text, /Any address can act|0–1 ratio|near 1 ⇒ liquidatable/);
    assert.match(text, /isLiquidationWhitelist/);
    assert.match(text, /marketWhitelist/);
    assert.match(text, /marketUserWhitelist/);
    assert.match(text, /permissions? (?:are |is )?unknown, stop/i);
    assert.match(text, /quote does not (?:check|prove).*permission/i);
  }
  const v2 = read('skills/justlend-lending-v2/SKILL.md');
  assert.match(v2, /errorCode: insufficient_allowance/);
  assert.doesNotMatch(v2, /INSUFFICIENT_ALLOWANCE/);
  assert.match(v2, /Confirm the necessary approval separately/);
});

test('V1 write triggers have prechecks, separate confirmation and post-state recovery', () => {
  const text = read('skills/justlend-lending-v1/SKILL.md');
  for (const tool of ['approve_underlying', 'supply', 'borrow', 'repay', 'withdraw', 'enter_market', 'exit_market']) {
    assert.ok(text.includes(`\`${tool}\``), `missing workflow tool ${tool}`);
  }
  assert.match(text, /bundled nine-tool server cannot execute writes/);
  assert.match(text, /Separately preview and confirm/);
  assert.match(text, /stop and reconcile the original tx/);
});

test('each isolated module resolves safety only when the shared tree is installed', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'justlend-guidance-'));
  try {
    for (const id of modules) {
      const isolated = join(temporary, 'isolated', id);
      cpSync(new URL(`../skills/${id}`, import.meta.url), isolated, { recursive: true });
      const text = readFileSync(join(isolated, 'SKILL.md'), 'utf8');
      assert.match(text, /explicitly load \[Shared write safety v1\]\(\.\.\/SAFETY\.md\)/);
      assert.match(text, /if unavailable, remain read-only/);
      assert.equal(existsSync(join(isolated, '../SAFETY.md')), false);
    }
    cpSync(new URL('../skills/', import.meta.url), join(temporary, 'complete'), { recursive: true });
    for (const id of modules) {
      assert.equal(readFileSync(join(temporary, 'complete', id, '../SAFETY.md'), 'utf8'), read('skills/SAFETY.md'));
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('shared safety provides per-module prechecks and unresolved-write recovery without claiming runtime validation', () => {
  const safety = read('skills/SAFETY.md');
  for (const id of modules) assert.ok(safety.includes(`\`${id}\``), `missing recovery row: ${id}`);
  assert.match(safety, /On refusal, cancellation or changed parameters, stop/);
  assert.match(safety, /A tx hash is evidence of submission, \*\*not confirmed success\*\*/);
  assert.match(safety, /unrecognized codes/);
  assert.match(safety, /not proof that a client loaded or enforced/);
});

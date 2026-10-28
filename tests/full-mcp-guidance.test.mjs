import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MCP_TOOLS } from '../scripts/mcp_tools.mjs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('skill tool tables resolve against a source-bound full-server registry, not the bundled nine tools', () => {
  const snapshot = JSON.parse(read('tests/fixtures/full-mcp-capabilities.json'));
  assert.match(snapshot.sourceCommit, /^[a-f0-9]{40}$/);
  assert.equal(snapshot.publicationClaim, false);
  const tools = new Map(snapshot.tools.map(tool => [tool.name, tool]));
  assert.equal(tools.size, snapshot.tools.length);
  const modules = JSON.parse(read('skills/_meta.json')).skills;
  for (const { id } of modules) {
    let inToolTable = false;
    for (const line of read(`skills/${id}/SKILL.md`).split('\n')) {
      if (line.startsWith('| Tool |')) inToolTable = true;
      else if (!line.startsWith('|')) inToolTable = false;
      const name = inToolTable && line.match(/^\| `([a-z0-9_]+)` \|/)?.[1];
      if (name) assert.ok(tools.has(name), `${id} references missing tool ${name}`);
    }
  }
  assert.equal(MCP_TOOLS.length, 9);
  for (const name of ['get_risk_alerts', 'get_risk_alert_rules', 'get_risk_alert_markets']) {
    const tool = tools.get(name);
    assert.equal(tool.readOnlyHint, true);
    assert.equal(tool.destructiveHint, false);
    assert.deepEqual(tool.inputs, name === 'get_risk_alert_rules' ? ['network'] : ['address', 'network']);
    assert.deepEqual(tool.required, name === 'get_risk_alert_rules' ? [] : ['address']);
    assert.ok(!MCP_TOOLS.some(bundled => bundled.name === name));
  }
});
test('alert guidance is read-only with runtime capability and endpoint gates, not a signing workaround', () => {
  const text = read('skills/justlend-risk-alerts/SKILL.md');
  assert.match(text, /tools\/list/);
  assert.match(text, /JUSTLEND_ALERT_API_URL/);
  assert.match(text, /Mainnet TRON only/);
  assert.match(text, /null.*unknown/);
  assert.match(text, /emailBound.*not.*email address/);
  assert.match(text, /Do not create, edit, toggle, delete/);
  assert.match(text, /deviceId\/cookieId/);
  assert.match(text, /JustLend DAO Risk Alert/);
});
test('metadata preserves historical values without inventing a publication for these capabilities', () => {
  const meta = JSON.parse(read('skills/_meta.json'));
  assert.equal(meta.displayName, 'JustLend Skills');
  assert.equal(meta.latest.publishedAt, 1787129972000);
  assert.equal(meta.latest.commit, '');
  assert.equal(meta.development.published, false);
  assert.match(meta.development.releaseMetadataStatus, /historical.*unverified/);
  assert.ok(meta.skills.some(({ id }) => id === 'justlend-risk-alerts'));
  assert.match(read('README.md'), /source snapshot, not a published release/);
});
test('mining workflow does not turn backend payloads into on-chain claimability', () => {
  const text = read('skills/justlend-lending-v2/SKILL.md').replace(/\s+/g, ' ');
  assert.match(text, /accruing.*settling.*settled/);
  assert.match(text, /published root/);
  assert.match(text, /backend payload.*not.*claimability/);
  assert.match(text, /mining claim-info/);
  assert.match(text, /original receipt/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MCP_TOOLS } from '../scripts/mcp_tools.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('JL-047: bundled setup surfaces consistently state mainnet-only support', () => {
  for (const path of ['README.md', 'SKILL.md', '.env.example', 'install.sh']) {
    const text = read(path);
    assert.match(text, /mainnet.only/i, path);
    assert.doesNotMatch(text, /mainnet \(default\) or nile|mainnet or nile|prefer \*\*Nile testnet\*\* \(`NETWORK=nile`\)/i, path);
  }
});

test('JL-050: tool and base skill do not promise an account health factor', () => {
  const description = MCP_TOOLS.find(tool => tool.name === 'get_account_summary').description;
  assert.doesNotMatch(description, /health.?factor/i);
  assert.match(description, /liquidityUSD/);
  assert.match(description, /shortfallUSD/);
  const skill = read('SKILL.md');
  assert.doesNotMatch(skill, /check health factor|Health factor, liquidity/i);
  assert.match(skill, /does not compute `healthFactor`/);
  assert.match(skill, /isLiquidatable/);
});

test('JL-050: README documents actual result fields and does not invent a borrowing simulation', () => {
  const text = read('README.md');
  for (const field of ['liquidityUSD', 'shortfallUSD', 'isLiquidatable', 'status', 'tvlUSD', 'totalSupplyAPY']) {
    assert.ok(text.includes('`' + field + '`'), field);
  }
  assert.match(text, /does not compute `healthFactor`/);
  assert.match(text, /does not return `tvl`, `totalSupply` or `totalBorrow`/);
  assert.doesNotMatch(text, /Your health factor is 2\.1|borrowing \$500 drops it/);
});

test('JL-051: project Claude Code instructions and cleanup use .mcp.json', () => {
  const section = read('README.md').split('### Claude Code\n')[1].split('\n### ')[0];
  assert.match(section, /project.root `\.mcp\.json`/i);
  assert.doesNotMatch(section, /\.claude\/settings\.local\.json/);
  const config = JSON.parse(section.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(config.mcpServers.justlend.command, 'node');
  assert.equal(config.mcpServers.justlend.env.TRONGRID_API_KEY, '${TRONGRID_API_KEY}');
  assert.match(read('uninstall.sh'), /Claude Code:.*\.mcp\.json/);
  assert.doesNotMatch(read('uninstall.sh'), /\.claude\/settings\.local\.json/);
});

test('development watch uses the required Node runtime without vulnerable nodemon', () => {
  const manifest = JSON.parse(read('package.json'));
  assert.equal(manifest.scripts.dev, 'node --watch scripts/mcp_server.mjs');
  assert.equal(manifest.devDependencies?.nodemon, undefined);
});

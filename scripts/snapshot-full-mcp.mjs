// Offline maintainer tool: build a clean full-server checkout first, then run
// node scripts/snapshot-full-mcp.mjs /absolute/path/to/mcp-server-justlend
// No network, signing, wallet initialization or release metadata updates.
import { execFileSync } from 'node:child_process';
import { realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = realpathSync(process.argv[2] || (() => { throw new Error('Pass a built full MCP checkout path.'); })());
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) throw new Error('Use a clean committed MCP checkout so provenance is reproducible.');
const sourceCommit = git('rev-parse', 'HEAD');
const { registerJustLendTools } = await import(pathToFileURL(resolve(root, 'build/core/tools/index.js')).href);
const tools = [];
registerJustLendTools({ registerTool(name, config) {
  const inputs = Object.keys(config.inputSchema ?? {});
  tools.push({ name, inputs, required: inputs.filter(key => !config.inputSchema[key].isOptional()),
    readOnlyHint: config.annotations?.readOnlyHint === true,
    destructiveHint: config.annotations?.destructiveHint === true });
} });
const snapshot = { sourceRepository: 'https://github.com/justlend/mcp-server-justlend', sourceCommit,
  publicationClaim: false, note: 'Offline registry snapshot only; connected tools/list remains authoritative.', tools };
writeFileSync(new URL('../tests/fixtures/full-mcp-capabilities.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Captured ${tools.length} tools from ${sourceCommit}; no publication claim.`);

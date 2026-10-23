import test from 'node:test';
import assert from 'node:assert/strict';
import guard from '../scripts/check-node-version.cjs';

test('installer refuses EOL/unpatched Node and accepts patched releases', () => {
  const rejected = ['v18.20.5', 'v20.19.2', 'v21.7.1', 'v22.23.3', 'v23.11.0', 'v24.22.0', 'v25.9.0', 'v26.12.0', 'v22.23.4-rc.1'];
  const accepted = ['v22.23.4', 'v22.24.0', 'v24.22.1', 'v24.23.0', 'v26.12.1', 'v27.0.0'];
  for (const version of rejected) assert.equal(guard.isSupportedNodeVersion(version), false, version);
  for (const version of accepted) assert.equal(guard.isSupportedNodeVersion(version), true, version);
});

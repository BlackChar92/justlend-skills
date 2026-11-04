import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import JustLendAPI from '../scripts/justlend_api.mjs';
import { createToolError, createToolSuccess } from '../scripts/mcp_contract.mjs';

const ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
const word = value => BigInt(value).toString(16).padStart(64, '0');
const tuple = (error = 0n, liquidity = 0n, shortfall = 0n) =>
  [error, liquidity, shortfall].map(word).join('');

function construct(network) {
  const previous = process.env.NETWORK;
  try {
    if (network === undefined) delete process.env.NETWORK;
    else process.env.NETWORK = network;
    return new JustLendAPI();
  } finally {
    if (previous === undefined) delete process.env.NETWORK;
    else process.env.NETWORK = previous;
  }
}

function fixture(hex = tuple()) {
  const api = construct('mainnet');
  const calls = [];
  api.tronWeb = {
    trx: { getBalance: async () => { calls.push('native'); return 123000000; } },
    transactionBuilder: {
      triggerConstantContract: async () => {
        calls.push('contract');
        return { constant_result: [hex] };
      },
    },
  };
  return { api, calls };
}

for (const network of [undefined, '', ' ', 'mainnet', ' MAINNET ']) {
  test(`JL-047: ${JSON.stringify(network)} selects the documented mainnet default`, () => {
    assert.equal(new URL(construct(network).tronWeb.fullNode.host).origin, 'https://api.trongrid.io');
  });
}
for (const network of ['nile', 'shasta', 'not-a-network']) {
  test(`JL-047: ${network} is rejected instead of querying mainnet`, () => {
    assert.throws(() => construct(network), /mainnet only/i);
  });
}
test('JL-047: the real stdio entry rejects Nile at startup without a request', () => {
  const result = spawnSync(process.execPath, ['scripts/mcp_server.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, NETWORK: 'nile' },
    encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mainnet only/i);
});

for (const token of ['TRX', 'trx']) {
  test(`JL-048: native ${token} retains its balance response`, async () => {
    const { api, calls } = fixture();
    assert.deepEqual(await api.getTokenBalance(ADDRESS, token), {
      address: ADDRESS, balance: '123.000000 TRX',
    });
    assert.deepEqual(calls, ['native']);
  });
}
for (const token of ['USDT', 'usdt']) {
  test(`JL-048: known TRC20 ${token} retains contract balance units`, async () => {
    const { api, calls } = fixture(word(2500000n));
    assert.deepEqual(await api.getTokenBalance(ADDRESS, token), {
      address: ADDRESS, token, balance: '2.5',
    });
    assert.deepEqual(calls, ['contract']);
  });
}
for (const token of ['NOT_A_TOKEN', '401', '429', 'API_KEY', '', undefined, 42]) {
  test(`JL-048: invalid shortcut ${JSON.stringify(token)} fails before any read`, async () => {
    const { api, calls } = fixture();
    await assert.rejects(api.getTokenBalance(ADDRESS, token), error => {
      const wrapped = createToolError('get_token_balance', error);
      assert.equal(wrapped.isError, true);
      assert.equal(wrapped.structuredContent.errorCode, 'invalid_input');
      assert.equal(wrapped.structuredContent.retryable, false);
      return true;
    });
    assert.deepEqual(calls, []);
  });
}

test('JL-048: allowance shares the same typed shortcut validation', async () => {
  const { api, calls } = fixture();
  await assert.rejects(api.checkAllowance(ADDRESS, '429'), error => {
    const wrapped = createToolError('check_allowance', error);
    assert.equal(wrapped.structuredContent.errorCode, 'invalid_input');
    assert.equal(wrapped.structuredContent.retryable, false);
    return true;
  });
  assert.deepEqual(calls, []);
  assert.equal((await api.checkAllowance(ADDRESS, 'trx')).needsApproval, false);
  assert.deepEqual(calls, []);
});

for (const error of [1n, 13n, 401n, 429n, 2n ** 256n - 1n]) {
  test(`JL-049: nonzero Comptroller code ${error} never becomes SAFE`, async () => {
    const { api } = fixture(tuple(error, 1000000000000000000n, 0n));
    await assert.rejects(api.getAccountSummary(ADDRESS), failure => {
      assert.match(failure.message, /Comptroller query failed/);
      const wrapped = createToolError('get_account_summary', failure);
      assert.equal(wrapped.isError, true);
      assert.equal(wrapped.structuredContent.errorCode, 'internal');
      assert.equal(wrapped.structuredContent.retryable, false);
      assert.equal('result' in wrapped.structuredContent, false);
      assert.doesNotMatch(JSON.stringify(wrapped), /SAFE/);
      return true;
    });
  });
}
for (const shortfall of [0n, 1n, 1000000000000000000n]) {
  test(`JL-049: successful query with ${shortfall} raw shortfall units preserves risk`, async () => {
    const { api } = fixture(tuple(0n, 0n, shortfall));
    const result = await api.getAccountSummary(ADDRESS);
    assert.equal(result.status, shortfall === 0n ? 'SAFE' : 'AT RISK');
    assert.equal(result.isLiquidatable, shortfall > 0n);
    assert.equal(result.shortfallUSD, shortfall === 1000000000000000000n ? '1.00' : '0.00');
    assert.deepEqual(Object.keys(result).sort(), ['address', 'isLiquidatable', 'liquidityUSD', 'shortfallUSD', 'status']);
    assert.deepEqual(JSON.parse(createToolSuccess('get_account_summary', result).content[0].text), result);
  });
}
test('JL-049: a complete uppercase ABI tuple remains supported', async () => {
  const { api } = fixture(tuple(0n, 42n, 0n).toUpperCase());
  assert.equal((await api.getAccountSummary(ADDRESS)).status, 'SAFE');
});
for (const [label, hex] of [
  ['191 hex digits', tuple().slice(1)],
  ['193 hex digits', tuple() + '0'],
  ['trailing newline', tuple() + '\n'],
  ['missing word', tuple().slice(0, 128)],
  ['nonhex word', 'z'.repeat(192)],
  ['negative error outside uint256', tuple(-1n)],
  ['negative shortfall outside uint256', tuple(0n, 0n, -1n)],
  ['empty result', ''],
  ['non-string result', 42],
]) {
  test(`JL-049: malformed ABI (${label}) cannot imply safety`, async () => {
    await assert.rejects(fixture(hex).api.getAccountSummary(ADDRESS));
  });
}

test('JL-049: absent ABI result cannot imply safety', async () => {
  const { api } = fixture();
  api.tronWeb.transactionBuilder.triggerConstantContract = async () => ({});
  await assert.rejects(api.getAccountSummary(ADDRESS));
});

test('JL-050: mapped markets expose the documented fields, not invented totals', async t => {
  t.mock.method(globalThis, 'fetch', async input => ({ json: async () =>
    String(input).includes('jtokenDetails') ? { code: 0, data: {} } : {
      code: 0, data: { jtokenList: [{ isValid: 1, collateralSymbol: 'TRX', jtokenAddress: 'TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP',
        depositedAPY: '0.01', borrowedAPY: '0.02', depositedUSD: '1000' }] },
    },
  }));
  const result = await construct('mainnet').getAllMarkets();
  assert.deepEqual(Object.keys(result[0]).sort(), ['borrowAPY', 'jToken', 'supplyAPY', 'symbol', 'totalSupplyAPY', 'tvlUSD']);
  assert.equal(result[0].supplyAPY, '1.00%');
  assert.equal(result[0].tvlUSD, '$1,000');
  assert.deepEqual(createToolSuccess('get_all_markets', result).structuredContent.result, result);
});

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const redirects = createRequire(import.meta.url)('follow-redirects');

async function listen(t, handler) {
  const server = createServer(handler);
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function get(url, options) {
  return new Promise((resolve, reject) => {
    const request = redirects.http.get(url, options, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', part => { body += part; });
      response.on('error', reject);
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.setTimeout(2000, () => request.destroy(new Error('Loopback fixture timed out')));
  });
}

for (const realm of ['same', 'cross']) for (const form of ['object', 'array']) {
  test(`GHSA-mrwp-f3q8-3g9p: ${realm}-realm sensitiveHeaders with ${form} headers`, async t => {
    const target = await listen(t, (req, res) => res.end(JSON.stringify(req.headers)));
    let initial;
    const source = await listen(t, (req, res) => {
      initial = req.headers;
      res.writeHead(302, { location: target }); res.end();
    });
    const sensitiveHeaders = realm === 'cross' ? runInNewContext('["X-API-Key"]') : ['X-API-Key'];
    assert.equal(Array.isArray(sensitiveHeaders), true);
    assert.equal(sensitiveHeaders instanceof Array, realm === 'same');
    const headers = form === 'object'
      ? { 'X-API-Key': 'offline-marker', 'X-Keep': 'visible' }
      : ['Host', new URL(source).host, 'X-API-Key', 'offline-marker', 'X-Keep', 'visible'];
    const forwarded = await get(source, { headers, sensitiveHeaders });
    assert.equal(initial['x-api-key'], 'offline-marker');
    assert.equal(forwarded['x-api-key'], undefined);
    assert.equal(forwarded['x-keep'], 'visible');
  });
}

test('redirect patch preserves declared credentials on the same origin', async t => {
  const source = await listen(t, (req, res) => {
    if (req.url === '/start') { res.writeHead(302, { location: '/received' }); res.end(); }
    else res.end(JSON.stringify(req.headers));
  });
  const forwarded = await get(`${source}/start`, {
    headers: { 'X-API-Key': 'offline-marker' }, sensitiveHeaders: runInNewContext('["X-API-Key"]'),
  });
  assert.equal(forwarded['x-api-key'], 'offline-marker');
});

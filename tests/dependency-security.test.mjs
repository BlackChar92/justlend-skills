import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import { z } from "zod";

const require = createRequire(import.meta.url);
const qs = require("qs");
const proxyAddr = require("proxy-addr");
const uri = require("fast-uri");

for (const subnet of ["::ffff:10.0.0.0/8", "::/1"]) {
  test(`short prefix ${subnet} must not trust an external IPv4 hop`, () => {
    assert.equal(proxyAddr.compile(subnet)("203.0.113.9", 0), false);
  });
}
test("valid proxy scopes keep their intended local range", () => {
  for (const subnet of ["10.0.0.0/8", "::ffff:10.0.0.0/104"]) {
    const trust = proxyAddr.compile(subnet);
    assert.equal(trust("10.1.2.3", 0), true);
    assert.equal(trust("203.0.113.9", 0), false);
  }
});

for (const key of ["a", "a[]"]) {
  for (const length of [2, 3, 4]) {
    test(`comma-array limit 3 for ${key} with ${length} entries`, () => {
      const query = `${key}=${Array.from({ length }, (_, i) => i + 1).join(",")}`;
      const parse = () => qs.parse(query, { comma: true, arrayLimit: 3, throwOnLimitExceeded: true });
      if (length > 3) assert.throws(parse, RangeError);
      else {
        const values = Array.from({ length }, (_, i) => String(i + 1));
        assert.deepEqual(parse(), { a: key === "a[]" ? [values] : values });
      }
    });
  }
}

for (const length of [2, 3, 4]) {
  test(`Zod max 3 preflights ${length} elements before refinement`, async () => {
    let visits = 0;
    const schema = z.array(z.number().refine(() => { visits++; return true; })).max(3);
    const result = await schema.safeParseAsync(Array(length).fill(1));
    assert.equal(result.success, length <= 3);
    assert.equal(visits, length <= 3 ? length : 0);
    if (!result.success) {
      assert.equal(result.error.issues.length, 1);
      assert.equal(result.error.issues[0].code, "too_big");
    }
  });
}

test("fast-uri rejects percent-encoded schemes and ambiguous hosts", () => {
  assert.ok(uri.parse("h%74tps://example.com/").error);
  assert.ok(uri.parse("https://example.com%2f.evil.test/").error);
});
test("fast-uri retains valid HTTPS and relative-reference semantics", () => {
  assert.equal(uri.parse("https://example.com/").host, "example.com");
  const input = "a/../../b";
  assert.equal(uri.resolve("https://example.com/x/y/", uri.normalize(input)), uri.resolve("https://example.com/x/y/", input));
});

// A vulnerable decompressor is isolated in a child, never the test runner or a
// deployed server. Send trailing bytes only after the valid frame was parsed.
const compressedProbe = String.raw`
const http = require('node:http');
const zlib = require('node:zlib');
const parser = require(process.argv[1]);
const encoding = process.argv[2];
const trailingMode = process.argv[3] === 'trailing';
const frame = encoding === 'gzip' ? zlib.gzipSync('{"a":1}') : zlib.deflateSync('{"a":1}');
const first = trailingMode ? Buffer.concat([frame, Buffer.from([0])]) : frame;
const trailing = trailingMode ? Buffer.alloc(1024, 0x58) : Buffer.alloc(0);
let request;
const server = http.createServer((req, res) => {
  if (req.method === 'GET') return res.end('alive');
  parser.json()(req, res, error => {
    if (error) { res.statusCode = error.status || 500; return res.end(error.message); }
    const finish = () => res.end(JSON.stringify(req.body));
    if (req.readableEnded) finish(); else req.once('end', finish);
    if (trailingMode) request.end(trailing);
    req.resume();
  });
});
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  request = http.request({hostname:'127.0.0.1', port, method:'POST', agent:false,
    headers:{'content-type':'application/json','content-encoding':encoding,'content-length':first.length+trailing.length}}, res => {
      let body=''; res.setEncoding('utf8'); res.on('data', part => {body+=part});
      res.on('end', () => {
        http.get({hostname:'127.0.0.1',port,agent:false}, health => {
          let alive=''; health.on('data', part => {alive+=part});
          health.on('end', () => {console.log(JSON.stringify({status:res.statusCode,body,alive}));server.close()});
        }).on('error', error => {throw error});
      });
    });
  request.on('error', error => {throw error});
  if (trailingMode) request.write(first); else request.end(first);
});
`;
const sdkRequire = createRequire(require.resolve("@modelcontextprotocol/sdk/server/index.js"));
const expressRequire = createRequire(sdkRequire.resolve("express/package.json"));
const parserPath = expressRequire.resolve("body-parser");
for (const [encoding, mode] of [["gzip", "valid"], ["gzip", "trailing"], ["deflate", "trailing"]]) {
  test(`compressed body ${encoding}/${mode} keeps the server alive`, { timeout: 10_000 }, () => {
    const output = execFileSync(process.execPath, ["-e", compressedProbe, parserPath, encoding, mode], {
      encoding: "utf8", timeout: 8000, maxBuffer: 16 * 1024,
    });
    assert.deepEqual(JSON.parse(output), { status: 200, body: '{"a":1}', alive: "alive" });
  });
}

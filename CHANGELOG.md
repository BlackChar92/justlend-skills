# Changelog

All notable changes to `justlend-skills`. Format based on Keep a Changelog.
`SPDX-License-Identifier: MIT`. Exact publish timestamps: see `skills/_meta.json`.


## [Unreleased]

### Security

- Clear the 2026-10-26 dependency-audit findings: upgrade MCP SDK to `1.32.1` and pin Axios `1.20.0`, fast-uri `3.1.9`, follow-redirects `1.16.1`, qs `6.16.0`, ip-address `10.7.4`, Hono `4.13.13`, body-parser `2.4.0`, brace-expansion `5.0.12`, proxy-addr `2.0.8`, and Zod `4.6.6`.
- Prefer next-to-latest stable releases where patched (SDK, follow-redirects, qs, ip-address, Hono, Zod). Axios, fast-uri 3.x, body-parser 2.x, brace-expansion 5.x and proxy-addr require their latest fixed release on the existing major line because the preceding release remains affected. Zod has no patched 3.x release; use patched 4.x through the SDK's supported peer range. Release order and advisory ranges checked on 2026-10-26.
- Add bounded offline regressions for proxy trust, comma-array limits, Zod array preflight, URI parsing and compressed-body decoder cleanup. Tests use synthetic inputs and loopback servers; they do not establish exploitability of every audit alert through the bundled stdio server.

### CI

- Add pull-request and master-push checks for clean dependency installation, production and full dependency audits, offline tests, the exact Node.js 24.22.1 guard, and script/installer syntax. Audit thresholds are not relaxed.
- Exercise the actual bundled stdio process with the installed SDK: nine read-only tools, versioned success/error results, offline market inventory and rejection of unsupported writes. No wallet signing or live API is required.

## [1.1.1] — 2026-08-19

### Added (MCP contract)
- Added the `justlend-energy-purchase` skill for quote-first, explicitly confirmed direct energy purchases with order recovery and duplicate-payment safeguards.
- All 9 bundled read tools now declare a common `outputSchema` and return versioned `structuredContent` while preserving the legacy JSON text payload.
- Bundled server failures now expose stable `errorCode`, `retryable`, and `hint` fields in JSON instead of prose-only errors.
- Read API failures now propagate to the MCP classifier, and the bundled CLI exits nonzero on execution failures.
- Offline Node tests lock tool count, schema coverage, backward-compatible success output, and retry classification.
- A live smoke check fails on canonical market-count or symbol drift instead of merely printing API output.

### Fixed (market inventory)
- Reconciled the canonical V1 inventory to **24 markets (18 active + 6 legacy)**, including active `jU`.
- Renamed the 8-market table as bundled balance/allowance shortcuts so agents do not mistake it for the complete protocol roster.
- Server version now comes from `package.json`; package, Skills metadata, and client plugin manifests advance together to `1.1.1`.
- Refreshed transitive dependency overrides so production and development audits report no known vulnerabilities.
- Aligned energy direct-purchase guidance with the official mainnet default, public payer-history recovery, tokenless idempotent responses, the exact signed-request recovery-file boundary, and the no-argument configured-wallet risk check.

### Added (docs / agent-readiness)
- **Agent Workflows** — closed-loop examples: read+advise routing, V1/V2 disambiguation, a HITL write path, and error/boundary handling.
- **Skill Inputs, Outputs & Failure Handling** table — per-skill read/write tools, return shape, and the no-auto-retry contract for writes.
- **Per-skill risk profile** and **agent-misfire recovery** guidance under Safety & Boundaries.
- **Troubleshooting** expanded to a symptom → cause → fix table (discovery, credentials, rate limit, network mismatch, version drift).
- Install flow gained **Verify / Upgrade / Uninstall** steps; Client Configuration gained **load-verification** and **conflict handling**; Overview gained an explicit **When *not* to use** list; the dependency matrix gained a **graceful-degradation** note.

### Fixed (docs accuracy)
- Installation guidance now identifies GitHub as the distribution source and explicitly notes that `@justlend/justlend-skills` is not published to npm; the package is marked private to prevent accidental publication.
- Error-shape documentation now distinguishes the bundled versioned MCP envelope from the full server's broader tool-specific error catalog.
- USDT/USDC/USDJ approve wording: the reset-to-0 is **defensive** (front-end parity; on-chain probing shows current TRON deployments don't enforce the guard), not a protocol requirement.

### Migration
- Existing clients can keep parsing the text payload. Schema-aware clients should migrate to `structuredContent` and pin output schema major `1`.
- Error text is now JSON rather than `Error: <message>`; branch on `errorCode` / `retryable` instead of parsing prose.

## [1.1.0]

### Added
- **JustLend V2 (Moolah)** isolated-market skill (`justlend-lending-v2`): ERC4626 supply vaults, `(collateral, loan)` borrow markets, per-market `risk`/`lltv`, liquidation, and history.
- Multi-client manifests for Codex (`.codex/`) and OpenCode (`.opencode/`) alongside the Claude Desktop / Claude Code / Cursor configs.
- Routing frontmatter (`name` / `description` with when-to-use + negative triggers) on every `SKILL.md`.

### Notes
- The bundled MCP server (`scripts/mcp_server.mjs`) remains **read-only (9 tools)**. Write operations (supply/borrow/repay/withdraw, sTRX staking, energy rental, governance voting) require the full [@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend) **plus a signing wallet** — the bundled server never signs or moves funds.

## [1.0.0]

### Added
- Initial read-only skills package: market data, protocol dashboard, account health, TRC20 balances, and allowances via a 9-tool stdio MCP server + a CLI (`scripts/justlend_api.mjs`).

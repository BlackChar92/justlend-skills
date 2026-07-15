# Changelog

All notable changes to `justlend-skills`. Format based on Keep a Changelog.
`SPDX-License-Identifier: MIT`. Exact publish timestamps: see `skills/_meta.json`.

## [Unreleased]

### Added (docs / agent-readiness)
- **Agent Workflows** — closed-loop examples: read+advise routing, V1/V2 disambiguation, a HITL write path, and error/boundary handling.
- **Skill Inputs, Outputs & Failure Handling** table — per-skill read/write tools, return shape, and the no-auto-retry contract for writes.
- **Per-skill risk profile** and **agent-misfire recovery** guidance under Safety & Boundaries.
- **Troubleshooting** expanded to a symptom → cause → fix table (discovery, credentials, rate limit, network mismatch, version drift).
- Install flow gained **Verify / Upgrade / Uninstall** steps; Client Configuration gained **load-verification** and **conflict handling**; Overview gained an explicit **When *not* to use** list; the dependency matrix gained a **graceful-degradation** note.

### Fixed (docs accuracy)
- Error-shape claims corrected to match the implementations: the **bundled** server returns a plain-text `Error: <message>` + `isError` (no structured fields); the structured `{ error, errorCode, retryable, hint }` envelope belongs to the **full** server only.
- USDT/USDC/USDJ approve wording: the reset-to-0 is **defensive** (front-end parity; on-chain probing shows current TRON deployments don't enforce the guard), not a protocol requirement.

### Migration
- Documentation only — no code, tool, or API changes. No action required; re-pull for the updated README.

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

# Shared write safety — v1

Applies to the six write modules shipped with this checkout (rules revision
2026-10-19). It is not a claim that a particular MCP release or client enforces
every rule. The bundled nine-tool server is read-only; writes require the full
`@justlend/mcp-server-justlend` and a signing wallet.

## Loading responsibility

When a write module is selected, the host/agent must explicitly read this file
through the module's relative link before planning a signing call. Do not assume
that discovering a skill also loads the root SKILL.md, README, or sibling files.
Install/symlink the complete `skills/` tree; copying a module alone omits this
dependency. If these rules or the full server's tool schemas cannot be loaded,
continue with read-only checks and report the missing dependency; do not write.

## Confirm the actual operation

1. Resolve the configured wallet and network, contract/market, asset and decimals.
   Query balances, allowance and operation-specific state (health, pause flags,
   timelocks, quote or proposal status). Missing/degraded values are **unknown**,
   not zero, false or permission to proceed. Use preview/simulation where supported;
   if unavailable, disclose that limitation rather than inventing a successful simulation.
2. Present the exact tool and parameters: network, signer, target/recipient,
   direction, asset, amount, spender for an approval, fees/limits, and locks or
   irreversible consequences. Quote-bound payments also need payee, receivers,
   duration and exact quote amount. Never silently substitute a wallet, network,
   market, receiver or MAX approval.
3. The host must obtain explicit confirmation **before each write tool**. A query,
   approval transaction, or earlier workflow approval does not authorize the next
   asset-moving call. Disclose tools that can emit multiple transactions (such as
   allowance reset followed by approval). Bind consent to the displayed parameters.
4. On refusal, cancellation or changed parameters, stop. Refresh relevant reads
   and obtain new confirmation for the revised operation. A safety check in the
   server supplements this client responsibility; MCP annotations are not consent.

## Results, failures and recovery

- A tx hash is evidence of submission, **not confirmed success**. Inspect the
  transaction receipt and relevant post-state before reporting completion. Keep
  the network, tx hash and order/market identifiers for recovery, not secrets.
- Retry transient **read** failures with bounded backoff. The full server's
  `retryable: true` is not permission to replay a write. On unrecognized codes,
  absent `retryable`, malformed output, or unknown data, stop the write path and
  explain what is missing; do not infer success from HTTP 200 or a nonempty body.
- If a write times out or the client disconnects, query its receipt and post-state
  first. A balance alone may not prove whether that exact transaction landed.
  Keep an unresolved outcome pending; do not submit a replacement automatically.
  A new write is allowed only after resolving the earlier outcome, refreshing the
  preconditions, and obtaining confirmation again.
- For direct energy purchase, use public purchase history and the no-argument
  `get_energy_payment_risk` check. These are observation only. Internal retries
  may reuse the exact signed payment; the agent must not create a new payment or
  attempt to clear/replay a risk file itself. Follow the purchase module's recovery
  rules when a separately confirmed tool call is required.
- Examples: after an uncertain borrow, inspect the tx and that market's debt;
  after an uncertain sTRX claim, inspect the tx, TRX balance and claimable amount;
  after an uncertain liquidation, inspect that exact target/market and receipt
  rather than repeating the liquidation because it still appears in an API list.

## Credentials and capability boundaries

Never request private keys or expose signed transactions, auth tokens or recovery
files in chat/logs. Use the configured wallet integration. Tool names and input
schemas from the connected full server are authoritative: illustrative shorthand
is not an alias. If a required tool or field is absent, report a version/capability
mismatch instead of substituting a lower-safety path.

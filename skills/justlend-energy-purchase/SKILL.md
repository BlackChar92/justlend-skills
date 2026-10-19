---
name: justlend-energy-purchase
description: >-
  Buy TRON Energy directly through JustLend using an authoritative API quote and
  a native TRX payment that is signed locally but broadcast by the configured
  backend. Use when the user wants to buy energy immediately, compare direct
  purchase pricing, inspect a purchase order, or recover an uncertain
  payment. Writes require the full MCP server, a signing wallet, and
  per-payment user confirmation; mainnet uses the official production API by
  default. Not for long-term
  energy rental or staking/freezing TRX for resources.
---

# JustLend Energy Direct Purchase

Before a write, explicitly load [Shared write safety v1](../SAFETY.md) from this
checkout. The host/agent owns loading and confirmation; if unavailable, remain read-only.

Use the full [`@justlend/mcp-server-justlend`](https://github.com/justlend/mcp-server-justlend).
The bundled read-only server in this repository does not sign payments.

## Tools

| Tool | Purpose | Write? |
|------|---------|:------:|
| `get_energy_purchase_config` | Live limits, durations, prices, and pool capacity | No |
| `quote_energy_purchase` | Authoritative quote; does not create or reserve an order | No |
| `get_energy_purchase_order` | Order and delivery state | No |
| `get_energy_purchase_history` | Public payer history for in-progress and settled orders | No |
| `get_energy_payment_risk` | Report unresolved risks for the configured wallet; no inputs and no payment replay | No |
| `buy_energy_direct` | Sign a TRX payment and submit it for backend broadcast | **Yes** |

## Safety Rules

1. On mainnet, use the full server's official default `https://tegrow.ablesdxd.link`. Set `JUSTLEND_ENERGY_API_URL` only for an explicitly trusted custom/test service; never pair the production API with a non-mainnet signer or substitute another JustLend API host.
2. Load `get_energy_purchase_config` and use its limits, durations, and prices. Do not invent economic fallback values.
3. Call `quote_energy_purchase` immediately before every purchase.
4. Show the user the network, payer, quoted `payment_address` (payee), every receiver, energy per receiver, duration, exact `total_sun` converted to TRX, and the fact that the backend may broadcast the payment.
5. Call `buy_energy_direct` only after explicit confirmation of that exact payment. Pass the quoted `total_sun` as `expectedAmountSun`, the confirmed `payment_address` as `expectedPayAddress`, and set `confirmPayment=true` only then. The server already validates the payee; do not omit this client-side binding or substitute a new address without confirmation.
6. Never request, display, or log a private key or signed transaction. The full server may persist the exact signed request in its local mode-`0600` recovery file after signing; treat it as sensitive and broadcastable until expiry. Normal MCP output must redact it.
7. Never broadcast the payment locally. The configured backend validates and may broadcast it.
8. On a timeout or unknown submission result, retry only the same signed transaction through the tool's internal workflow. Never initiate another purchase silently.
9. If `payment_result_unknown`, `tx_already_claimed`, `payment_risk_unresolved`, or `reconciliationRequired=true` appears, call `get_energy_purchase_history` and then call `get_energy_payment_risk` with no arguments. The risk check only reports state for the configured wallet; it never replays or clears a stored payment. Block a new payment until recovery succeeds and the risk list is empty. Any replay of the exact stored request may occur only inside a separately user-confirmed `buy_energy_direct` call.

## Purchase Workflow

1. Call `get_energy_purchase_config`.
2. Validate receiver addresses and choose a live `duration` and permitted energy amount.
3. Call `quote_energy_purchase`.
4. If `can_fulfill` is false or the pool is insufficient, stop without opening the wallet.
5. Present the complete payment preview and wait for explicit confirmation.
6. Call `buy_energy_direct` with the confirmed amount (`expectedAmountSun`) and payee (`expectedPayAddress`), unchanged receivers/energy/duration/network, and `confirmPayment=true`.
7. Report the payment tx hash and order id. Track token-bearing non-terminal orders with `get_energy_purchase_order`; if an idempotent retry returns no token, return the pending result immediately and recover it through `get_energy_purchase_history` instead of polling without credentials.
8. Treat only `delivered`, `partial`, `failed`, `expired`, and `cancelled` as terminal. Do not describe `paid`, `pending`, or `delegating` as delivered.
9. Re-query purchase history and order state when a token exists, then call the no-argument `get_energy_payment_risk` check before any retry after a post-payment error. Treat it as observation only, not reconciliation.

## Error Handling

| Error | Action |
|-------|--------|
| `amount_changed` / `price_moved` | Re-fetch config and quote; require confirmation again |
| Payee mismatch or missing `expectedPayAddress` | Stop; refresh the quote and confirm the exact payee again; never bypass the server's check |
| `pool_insufficient` | Lower the requested energy/receiver count or wait; do not sign |
| `invalid_duration` | Use a duration from live config |
| `user_rejected` | Stop; do not retry automatically |
| `tx_expired` / `broadcast_failed` | Inspect history and the no-argument risk state first; recover only through a newly confirmed tool call |
| `delivery_failed` | Payment may already have moved; show tx/order and re-query state |
| `payment_result_unknown` | Block new payment; query public history, then inspect the configured wallet with the no-argument risk tool |

## Routing

- Use `justlend-energy-rental` for multi-day rental or return/cancel workflows.
- Use this skill for the separately quoted direct-purchase service.
- Explain the distinction before moving funds when the user's wording is ambiguous.

# JustLend Energy Direct Purchase

Direct purchase obtains a live backend quote, signs a native TRX transfer locally, and submits the
signed transaction to the configured service. The client does not broadcast the payment itself.

## Lifecycle

`config → quote → explicit confirmation → sign only → backend submit/broadcast → order/history reconciliation`

Terminal order states are `delivered`, `partial`, `failed`, `expired`, and `cancelled`.

## Operational boundary

- The full MCP server uses the official mainnet production endpoint `https://tegrow.ablesdxd.link` by default. `JUSTLEND_ENERGY_API_URL` is only an override for an explicitly trusted custom/test service; the production endpoint must not be paired with a non-mainnet signer.
- Purchase limits, supported durations, activation fees, unit prices, and resource-pool addresses are live API data.
- Preview and confirm the quote's `payment_address` together with `total_sun`, network,
  payer, receivers, energy and duration. Pass them unchanged as `expectedPayAddress`
  and `expectedAmountSun` to `buy_energy_direct`. The server already checks the payee;
  changed quote details require renewed confirmation, not a silent substitution.
- A signed transaction is sensitive because anyone holding it may broadcast it before expiration.
- After signing, an ambiguous result may persist the exact signed request in a local mode-`0600` recovery file. It is sensitive and broadcastable until expiry, and normal tool output must redact it.
- An ambiguous or tokenless idempotent result must retain a payment-risk marker and block a second payment until public history/order recovery clears it. `get_energy_payment_risk` takes no arguments, reports only the configured wallet’s unresolved state, and never replays or clears the signed request; any replay is confined to a separately confirmed `buy_energy_direct` recovery call.

See [`skills/justlend-energy-purchase/SKILL.md`](../skills/justlend-energy-purchase/SKILL.md) for the agent workflow and tool-level safety rules.

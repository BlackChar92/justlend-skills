---
name: justlend-energy-rental
description: >-
  Rent TRON Energy from the JustLend marketplace (cheaper than burning TRX for
  contract calls): check rental price, rent, and return energy. Use when the
  user wants to rent or return TRON energy, or lower transaction resource cost.
  Writes require the full MCP server plus a signing wallet. Not for bandwidth or
  staking-TRX-for-energy (that is TRX staking / freezing).
---

# JustLend Energy Rental

Before a write, explicitly load [Shared write safety v1](../SAFETY.md) from this
checkout. The host/agent owns loading and confirmation; if unavailable, remain read-only.

Energy rental skill for the JustLend marketplace. Rent TRON Energy at lower cost than burning TRX, enabling more efficient smart contract interactions.

> **Note**: This skill requires the full MCP server ([@justlend/mcp-server-justlend](https://github.com/justlend/mcp-server-justlend)) which provides `rent_energy`, `get_energy_rental_dashboard`, `calculate_energy_rental_price`, and other rental tools.

## Why Rent Energy?

- **Save Costs**: Renting Energy is often 50-80% cheaper than burning TRX for transaction fees
- **High Throughput**: Perform more transactions without waiting for daily free energy recovery
- **Flexible Duration**: Rent for days or weeks based on your needs

## Tools (Full MCP Server)

| Tool | Description | Write? |
|------|-------------|--------|
| `get_energy_rental_dashboard` | Market data (TRX price, exchange rate, APY, energy per TRX) | No |
| `get_energy_rental_params` | On-chain params (fees, limits, pause status) | No |
| `calculate_energy_rental_price` | Cost estimation for renting energy | No |
| `get_energy_rental_rate` | Current rental rate for a given TRX amount | No |
| `get_user_energy_rental_orders` | User's rental orders | No |
| `rent_energy` | Rent energy for a receiver address | **Yes** |
| `return_energy_rental` | Cancel an active rental | **Yes** |

## Examples

- "Show me the current energy rental rates on JustLend."
- "How much does it cost to rent 300,000 energy for 7 days?"
- "Rent 500,000 energy for my address for 14 days."
- "Cancel my active energy rental."

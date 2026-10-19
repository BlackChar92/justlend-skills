# sTRX Staking Guide

sTRX is a liquid staking token for TRX on JustLend.

## Benefits
- **Staking Rewards**: Earn TRX staking rewards automatically.
- **Liquidity**: sTRX can be used in other DeFi protocols while earning rewards.
- **Governance Power**: sTRX represents voting power in the TRON network.

## How it Works
1. **Stake**: Deposit TRX into the sTRX contract.
2. **Rewards**: Rewards are accrued to the sTRX/TRX exchange rate.
3. **Unstake**: Initiate a withdrawal to get TRX back (subject to the unbonding period).
4. **Claim**: After the waiting period, query `check_strx_withdrawal_eligibility`
   and `get_strx_account`, then separately confirm `claim_strx_rewards` (`claimAll`)
   for a known positive claimable amount. Inspect the receipt and refreshed state.
   Unknown/degraded data does not mean zero; stop and re-query. Calling
   `unstake_strx` again starts another withdrawal instead of collecting the old one.

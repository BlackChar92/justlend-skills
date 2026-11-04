// Test-only injection for the real stdio transport. Never contact an RPC or wallet.
import JustLendAPI from '../../scripts/justlend_api.mjs';

const getAccountSummary = JustLendAPI.prototype.getAccountSummary;
JustLendAPI.prototype.getAccountSummary = function (...args) {
  this.tronWeb = { transactionBuilder: { triggerConstantContract: async () => ({
    constant_result: [[13n, 0n, 0n].map(value => value.toString(16).padStart(64, '0')).join('')],
  }) } };
  return getAccountSummary.apply(this, args);
};
JustLendAPI.prototype.getTrxBalance = async () => {
  throw new Error('Unexpected native balance fallback in offline fixture');
};

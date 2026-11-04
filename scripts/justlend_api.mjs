import { TronWeb } from 'tronweb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// JustLend V1 Protocol Constants (Mainnet)
// Synced from mcp-server-justlend chains.ts
const CORE_CONTRACTS = {
  COMPTROLLER: 'TGjYzgCyPobsNS9n6WcbdLVR9dH7mWqFx7',
  PRICE_ORACLE: 'TGnYnSn4G9PgWFj7QQemh4YMZKp3fkympJ',
};

// JustLend API host
const API_HOST = 'https://labc.ablesdxd.link';

// Common jTokens (Mainnet) - addresses from mcp-server-justlend chains.ts
const MARKETS = {
  TRX:  { symbol: 'TRX',  jToken: 'TE2RzoSV3wFK99w6J9UnnZ4vLfXYoxvRwP', decimals: 6,  isNative: true },
  USDT: { symbol: 'USDT', underlying: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', jToken: 'TXJgMdjVX5dKiQaUi9QobwNxtSQaFqccvd', decimals: 6,  isNative: false },
  USDD: { symbol: 'USDD', underlying: 'TXDk8mbtRbXeYuMNS83CfKPaYYT8XWv9Hz', jToken: 'TKFRELGGoRgiayhwJTNNLqCNjFoLBh3Mnf', decimals: 18, isNative: false },
  USDC: { symbol: 'USDC', underlying: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', jToken: 'TNSBA6KvSvMoTqQcEgpVK7VhHT3z7wifxy', decimals: 6,  isNative: false },
  BTC:  { symbol: 'BTC',  underlying: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', jToken: 'TLeEu311Cbw63BcmMHDgDLu7fnk9fqGcqT', decimals: 8,  isNative: false },
  ETH:  { symbol: 'ETH',  underlying: 'THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF', jToken: 'TR7BUFRQeq1w5jAZf1FKx85SHuX6PfMqsV', decimals: 18, isNative: false },
  SUN:  { symbol: 'SUN',  underlying: 'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S', jToken: 'TPXDpkg9e3eZzxqxAUyke9S4z4pGJBJw9e', decimals: 18, isNative: false },
  WIN:  { symbol: 'WIN',  underlying: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', jToken: 'TRg6MnpsFXc82ymUPgf5qbj59ibxiEDWvv', decimals: 6,  isNative: false },
};

function getMarketShortcut(symbol) {
  const market = typeof symbol === 'string' && MARKETS[symbol.toUpperCase()];
  if (!market) {
    const label = typeof symbol === 'string' ? symbol : 'expected a bundled asset shortcut';
    throw Object.assign(new Error(`Unknown asset: ${label}`), { code: 'INVALID_ASSET' });
  }
  return market;
}

const MANTISSA = 1e18;

// Minimal Comptroller ABI for getAccountLiquidity
const COMPTROLLER_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "getAccountLiquidity",
    "outputs": [
      { "name": "", "type": "uint256" },
      { "name": "", "type": "uint256" },
      { "name": "", "type": "uint256" }
    ],
    "type": "function",
    "stateMutability": "view"
  }
];

class JustLendAPI {
  constructor() {
    const network = (process.env.NETWORK ?? '').trim().toLowerCase() || 'mainnet';
    if (network !== 'mainnet') {
      throw new Error('Unsupported NETWORK: bundled read-only queries support mainnet only.');
    }
    this.tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
    });
  }

  // --- Market Data ---

  // Fetch mining reward data for a jToken from detail API
  async _getJTokenMiningData(jtokenAddr) {
    try {
      const resp = await fetch(`${API_HOST}/justlend/markets/jtokenDetails?jtokenAddr=${jtokenAddr}`);
      const data = await resp.json();
      if (data.code !== 0) return null;
      const d = data.data;
      return {
        farmRewardUSD24h: parseFloat(d.farmRewardUSD24h || 0),
        farmRewardUsdd24h: parseFloat(d.farmRewardUsddAmount24h || 0),
        farmRewardTrx24h: parseFloat(d.farmRewardTrxAmount24h || 0),
      };
    } catch {
      return null;
    }
  }

  // Fetches comprehensive market data including mining/staking reward APY
  async getAllMarkets() {
    try {
      const response = await fetch(`${API_HOST}/justlend/markets`);
      const data = await response.json();
      if (data.code !== 0) throw new Error(`API Error: ${data.code}`);

      const activeMarkets = data.data.jtokenList
        .filter(m => m.isValid === "1" || m.isValid === 1);

      // Fetch mining details for all markets in parallel
      const miningDetails = await Promise.all(
        activeMarkets.map(m => this._getJTokenMiningData(m.jtokenAddress))
      );

      return activeMarkets.map((m, i) => {
        const supplyAPY = parseFloat(m.depositedAPY) * 100;
        const underlyingIncrementAPY = parseFloat(m.underlyingIncrementApy || 0) * 100;
        const borrowAPY = parseFloat(m.borrowedAPY) * 100;
        const tvlUSD = parseFloat(m.depositedUSD);

        // Mining APY from jToken details: (dailyRewardUSD * 365 / TVL) * 100
        const mining = miningDetails[i];
        const farmRewardUSD24h = mining?.farmRewardUSD24h || 0;
        const miningAPY = tvlUSD > 0 ? (farmRewardUSD24h * 365 / tvlUSD) * 100 : 0;

        const totalSupplyAPY = supplyAPY + underlyingIncrementAPY + miningAPY;

        const result = {
          symbol: m.collateralSymbol,
          jToken: m.jtokenAddress,
          supplyAPY: `${supplyAPY.toFixed(2)}%`,
          totalSupplyAPY: `${totalSupplyAPY.toFixed(2)}%`,
          borrowAPY: `${borrowAPY.toFixed(2)}%`,
          tvlUSD: `$${tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        };

        // Add mining detail when present
        if (miningAPY > 0) {
          result.miningAPY = `${miningAPY.toFixed(2)}%`;
          // Build reward detail string
          const parts = [];
          if (mining.farmRewardUsdd24h > 0) parts.push(`${mining.farmRewardUsdd24h.toFixed(0)} USDD`);
          if (mining.farmRewardTrx24h > 0) parts.push(`${mining.farmRewardTrx24h.toFixed(0)} TRX`);
          if (parts.length > 0) {
            result.miningRewardPerDay = `${parts.join(' + ')} ($${farmRewardUSD24h.toFixed(0)}/day)`;
          }
        }
        if (underlyingIncrementAPY > 0) {
          result.stakingAPY = `${underlyingIncrementAPY.toFixed(2)}%`;
        }

        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  // --- API Queries ---

  // Protocol dashboard: total supply, borrow, TVL, user count
  async getDashboard() {
    const resp = await fetch(`${API_HOST}/justlend/markets/dashboard`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(`API Error: ${data.code}`);
    return data.data;
  }

  // Detailed jToken info: interest rate model, reserves, mining rewards, etc.
  async getJTokenDetails(jtokenAddr) {
    const resp = await fetch(`${API_HOST}/justlend/markets/jtokenDetails?jtokenAddr=${jtokenAddr}`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(`API Error: ${data.code}`);
    return data.data;
  }

  // User account data from API (more stable than contract queries)
  async getAccountDataFromAPI(address) {
    const resp = await fetch(`${API_HOST}/justlend/account?addr=${address}`);
    const data = await resp.json();
    if (data.code !== 0) throw new Error(`API Error: ${data.code}`);
    return data.data;
  }

  // List the bundled balance/allowance shortcuts with addresses
  getSupportedMarkets() {
    return Object.entries(MARKETS).map(([key, m]) => ({
      symbol: m.symbol,
      jToken: m.jToken,
      underlying: m.underlying || 'native TRX',
      decimals: m.decimals,
      isNative: m.isNative,
    }));
  }

  // Check TRC20 allowance for a jToken market
  async checkAllowance(address, assetSymbol) {
    const market = getMarketShortcut(assetSymbol);
    if (market.isNative) return { asset: assetSymbol, allowance: 'Infinity', needsApproval: false, note: 'Native TRX does not require approval' };

    const result = await this.tronWeb.transactionBuilder.triggerConstantContract(
      market.underlying,
      'allowance(address,address)',
      { _isConstant: true },
      [
        { type: 'address', value: address },
        { type: 'address', value: market.jToken }
      ],
      address
    );
    const hex = result.constant_result?.[0];
    if (!hex) throw new Error('Failed to read allowance');
    const raw = BigInt('0x' + hex);
    const allowance = Number(raw) / (10 ** market.decimals);
    return {
      asset: assetSymbol,
      spender: market.jToken,
      allowance: allowance.toString(),
      needsApproval: allowance === 0,
    };
  }

  // --- Account & Position ---

  async getTrxBalance(address) {
    const balanceInSun = await this.tronWeb.trx.getBalance(address);
    return { address, balance: `${(balanceInSun / 1e6).toFixed(6)} TRX` };
  }

  async getTokenBalance(address, tokenSymbol) {
    const market = getMarketShortcut(tokenSymbol);
    if (market.isNative) return this.getTrxBalance(address);

    const result = await this.tronWeb.transactionBuilder.triggerConstantContract(
      market.underlying,
      'balanceOf(address)',
      { _isConstant: true },
      [{ type: 'address', value: address }],
      address
    );
    const hex = result.constant_result?.[0];
    if (!hex) throw new Error('Failed to read token balance');
    const balance = Number(BigInt('0x' + hex)) / (10 ** market.decimals);
    return { address, token: tokenSymbol, balance: balance.toString() };
  }

  async getAccountSummary(address) {
    try {
      const result = await this.tronWeb.transactionBuilder.triggerConstantContract(
        CORE_CONTRACTS.COMPTROLLER,
        'getAccountLiquidity(address)',
        { _isConstant: true },
        [{ type: 'address', value: address }],
        address
      );

      const hexResults = result.constant_result?.[0];
      if (typeof hexResults !== 'string' || hexResults.length !== 192 || !/^[0-9a-fA-F]+$/.test(hexResults)) {
        throw new Error('Failed to decode Comptroller response');
      }

      // Returns (uint256 error, uint256 liquidity, uint256 shortfall) — 3x 32-byte words
      const errorCode = BigInt('0x' + hexResults.substring(0, 64));
      if (errorCode !== 0n) {
        throw Object.assign(new Error(`Comptroller query failed with error code ${errorCode}`), {
          code: 'COMPTROLLER_QUERY_FAILED',
        });
      }
      const liquidity = BigInt('0x' + hexResults.substring(64, 128));
      const shortfall = BigInt('0x' + hexResults.substring(128, 192));

      const liquidityUSD = Number(liquidity) / MANTISSA;
      const shortfallUSD = Number(shortfall) / MANTISSA;

      return {
        address,
        liquidityUSD: liquidityUSD.toFixed(2),
        shortfallUSD: shortfallUSD.toFixed(2),
        isLiquidatable: shortfall > 0n,
        status: shortfall > 0n ? "AT RISK" : "SAFE"
      };
    } catch (error) {
      throw error;
    }
  }

}

// CLI Handler
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const api = new JustLendAPI();

  try {
    switch (command) {
      case 'markets':
        console.log(JSON.stringify(await api.getAllMarkets(), null, 2));
        break;
      case 'balance':
        console.log(JSON.stringify(await api.getTokenBalance(args[0], args[1] || 'TRX'), null, 2));
        break;
      case 'account':
        console.log(JSON.stringify(await api.getAccountSummary(args[0]), null, 2));
        break;
      case 'dashboard':
        console.log(JSON.stringify(await api.getDashboard(), null, 2));
        break;
      case 'jtoken-details': // Usage: node justlend_api.mjs jtoken-details <jtokenAddr>
        console.log(JSON.stringify(await api.getJTokenDetails(args[0]), null, 2));
        break;
      case 'account-api': // Usage: node justlend_api.mjs account-api <address>
        console.log(JSON.stringify(await api.getAccountDataFromAPI(args[0]), null, 2));
        break;
      case 'supported-markets':
        console.log(JSON.stringify(api.getSupportedMarkets(), null, 2));
        break;
      case 'allowance': // Usage: node justlend_api.mjs allowance <address> <symbol>
        console.log(JSON.stringify(await api.checkAllowance(args[0], args[1]), null, 2));
        break;
      default:
        console.log('Available commands: \n - markets \n - balance <address> [symbol] \n - account <address> \n - dashboard \n - jtoken-details <jtokenAddr> \n - account-api <address> \n - supported-markets \n - allowance <address> <symbol>');
    }
  } catch (error) {
    console.error("Execution Error:", error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

export default JustLendAPI;

const ganache = require("ganache-core");
const Wallet = require('ethereumjs-wallet').default;
const ProviderEngine = require("@trufflesuite/web3-provider-engine");
const WalletSubprovider = require('@trufflesuite/web3-provider-engine/subproviders/wallet.js');
const Web3Subprovider = require("@trufflesuite/web3-provider-engine/subproviders/provider.js");
const web3 = require("web3");

// const privateKey = "6ce2fe8a96e142f6268a0040c21a2ff750f908ab1d05119a352c4c1ca452d641";
// const privateKey = "84a2ce9cfc53fca0f39ed7f168294583a350a80ba5c9959f5193d45daa2daad8";


const uniswapSdk = require('@uniswap/sdk');
let testrpcProvider = null;
module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    mainnet: {
      //  host: "127.0.0.1",
      //  port: 7545,
      network_id: "1",
      provider: () => {
        const privateKey = process.env['ETH_DEPLOYER_PRIVATE_KEY']
        const wallet = new Wallet(new Buffer(privateKey, "hex"));
        const engine = new ProviderEngine();
        engine.addProvider(new WalletSubprovider(wallet, {}));
        engine.addProvider(new Web3Subprovider(new web3.providers.HttpProvider("http://127.0.0.1:7545", {keepAlive: false, timeout: 1000000})));
        engine.on = undefined;
        engine.start();
        return engine;      
      },
      networkCheckTimeout: 1000000,
      unswapRouterV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    ropsten: {
      network_id: "3",
      provider: () => {
        const privateKey = process.env['ETH_DEPLOYER_PRIVATE_KEY']
        const wallet = new Wallet(new Buffer(privateKey, "hex"));
        const engine = new ProviderEngine();
        engine.addProvider(new WalletSubprovider(wallet, {}));
        engine.addProvider(new Web3Subprovider(new web3.providers.HttpProvider("https://eth-ropsten.alchemyapi.io/v2/eCuq8woAYyIUVB5-CbjKxbRw8R16bp2O", {keepAlive: false, timeout: 1000000})));
        engine.on = undefined;
        engine.start();
        return engine;
      },
      networkCheckTimeout: 1000000,
      unswapRouterV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
      networkCheckTimeout: 100000,
      uniswapRouter02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      uniswapFactory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    testrpc: {
      network_id: "*",
      provider: () => {
        if (testrpcProvider == null) {
          testrpcProvider = ganache.provider({gasLimit: "0x8000000", secure: false});
        }
        return testrpcProvider;
      },
      networkCheckTimeout: 1000000,
      unswapRouterV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    test: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    }
  },

  compilers: {
    solc: {
      version: "v0.6.12+commit.27d51765"
    }
 },
 mocha: {
  enableTimeouts: false,
  before_timeout: 120000 // Here is 2min but can be whatever timeout is suitable for you.
 },

};



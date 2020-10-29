const Wallet = require('ethereumjs-wallet').default;
const ProviderEngine = require("@trufflesuite/web3-provider-engine");
const WalletSubprovider = require('@trufflesuite/web3-provider-engine/subproviders/wallet.js');
const Web3Subprovider = require("@trufflesuite/web3-provider-engine/subproviders/provider.js");

const Web3 = require("web3");

// const privateKey = "6ce2fe8a96e142f6268a0040c21a2ff750f908ab1d05119a352c4c1ca452d641";
const privateKey = "84a2ce9cfc53fca0f39ed7f168294583a350a80ba5c9959f5193d45daa2daad8";

const wallet = new Wallet(new Buffer(privateKey, "hex"));

const uniswapSdk = require('@uniswap/sdk');

module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      //  host: "127.0.0.1",
      //  port: 7545,
      network_id: "1",
      provider: (() => {
        const engine = new ProviderEngine();
        engine.addProvider(new WalletSubprovider(wallet, {}));
        engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider("http://127.0.0.1:7545", {keepAlive: false, timeout: 1000000})));
        engine.on = undefined;
        engine.start();
        return engine;      
      })(),
      networkCheckTimeout: 1000000,
      unswapRouterV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    },
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
      networkCheckTimeout: 10000,
      uniswapRouter02: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      uniswapFactory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
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

//  contracts_build_directory: "./output",

};



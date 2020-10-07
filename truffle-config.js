const Wallet = require('ethereumjs-wallet').default;
var ProviderEngine = require("@trufflesuite/web3-provider-engine");
var WalletSubprovider = require('@trufflesuite/web3-provider-engine/subproviders/wallet.js');
var Web3Subprovider = require("@trufflesuite/web3-provider-engine/subproviders/provider.js");

var Web3 = require("web3");

const privateKey = "4c2541cb416f4500e30d05075aaa5c7f5e65c834c1775ad54f961722da8baaf6";
var wallet = new Wallet(new Buffer(privateKey, "hex"));

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
     network_id: "5777",
     provider: (() => {
      var engine = new ProviderEngine();
      engine.addProvider(new WalletSubprovider(wallet, {}));
      engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider("http://127.0.0.1:7545", {keepAlive: false})));
      engine.on = undefined;
      engine.start();
      return engine;      
     })(),
     networkCheckTimeout: 10000,
     unswapRouterV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
     usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7"
   },
  //  test: {
    //  host: "127.0.0.1",
    //  port: 7545,
    //  network_id: "*",
    //  provider: engine
  //  }
  },

  compilers: {
    solc: {
      version: "v0.6.12+commit.27d51765"
    }
 },
 contracts_build_directory: "./output"
};


const ganache = require("ganache-core");
const Wallet = require('ethereumjs-wallet').default;
const ProviderEngine = require("@trufflesuite/web3-provider-engine");
const WalletSubprovider = require('@trufflesuite/web3-provider-engine/subproviders/wallet.js');
const Web3Subprovider = require("@trufflesuite/web3-provider-engine/subproviders/provider.js");
const web3 = require("web3");
const nconf = require("nconf");

nconf.argv().env().file({ file: './.config.json' });



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
                nconf.required(["DEPLOYER_PRIVATE_KEY"]);
                const privateKey = nconf.get("DEPLOYER_PRIVATE_KEY");
                const wallet = new Wallet(new Buffer(privateKey, "hex"));
                const engine = new ProviderEngine();
                engine.addProvider(new WalletSubprovider(wallet, {}));
                engine.addProvider(new Web3Subprovider(new web3.providers.HttpProvider("http://127.0.0.1:7545", {
                    keepAlive: false,
                    timeout: 1000000
                })));
                engine.on = undefined;
                engine.start();
                return engine;
            },
            networkCheckTimeout: 1000000,
        },
        ropsten: {
            network_id: "3",
            provider: () => {
                nconf.required(["DEPLOYER_PRIVATE_KEY"]);
                const privateKey = nconf.get("DEPLOYER_PRIVATE_KEY");
                const wallet = new Wallet(new Buffer(privateKey, "hex"));
                const engine = new ProviderEngine();
                engine.addProvider(new WalletSubprovider(wallet, {}));
                engine.addProvider(new Web3Subprovider(new web3.providers.HttpProvider("https://eth-ropsten.alchemyapi.io/v2/eCuq8woAYyIUVB5-CbjKxbRw8R16bp2O", {
                    keepAlive: false,
                    timeout: 1000000
                })));
                engine.on = undefined;
                engine.start();
                return engine;
            },
            networkCheckTimeout: 1000000,
        },
        rinkeby: {
            network_id: "4",
            provider: () => {
                nconf.required(["DEPLOYER_PRIVATE_KEY"]);
                const privateKey = nconf.get("DEPLOYER_PRIVATE_KEY");
                const wallet = new Wallet(new Buffer(privateKey, "hex"));
                const engine = new ProviderEngine();
                engine.addProvider(new WalletSubprovider(wallet, {}));
                engine.addProvider(new Web3Subprovider(new web3.providers.HttpProvider("http://127.0.0.1:8545", {
                    keepAlive: false,
                    timeout: 1000000
                })));
                engine.on = undefined;
                engine.start();
                return engine;
            },
            networkCheckTimeout: 1000000,
        },
        development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "5777",
            networkCheckTimeout: 100000,
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
        },
        test: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
        }
    },

    compilers: {
        solc: {
            version: "v0.7.6+commit.7338295f"
        }
    },
    mocha: {
        enableTimeouts: false,
        before_timeout: 120000 // Here is 2min but can be whatever timeout is suitable for you.
    },

};

const ganache = require("ganache-core");
const Wallet = require('ethereumjs-wallet').default;
const ProviderEngine = require("@trufflesuite/web3-provider-engine");
const WalletSubprovider = require('@trufflesuite/web3-provider-engine/subproviders/wallet.js');
const Web3Subprovider = require("@trufflesuite/web3-provider-engine/subproviders/provider.js");
const web3 = require("web3");
const nconf = require("nconf");

nconf.argv().env().file({ file: './.config.json' });
function provider(url) {
    nconf.required(["DEPLOYER_PRIVATE_KEY"]);
    const privateKey = nconf.get("DEPLOYER_PRIVATE_KEY");
    const wallet = new Wallet(Buffer.from(privateKey, "hex"));
    const engine = new ProviderEngine();
    engine.addProvider(new WalletSubprovider(wallet, {}));
    engine.addProvider(new Web3Subprovider(new web3.providers.HttpProvider(url, { keepAlive: true, timeout: 1000000 })));
    engine.on = (block) => { }
    engine.start();
    return engine;
}


let testrpcProvider = null;
module.exports = {
    // Uncommenting the defaults below
    // provides for an easier quick-start with Ganache.
    // You can also follow this format for other networks;
    // see <http://truffleframework.com/docs/advanced/configuration>
    // for more details on how to specify configuration options!
    //
    networks: {
        testnet: {
            network_id: "97",
            provider: () => provider("https://data-seed-prebsc-1-s1.binance.org:8545/"),
            networkCheckTimeout: 1000000,
            gasPrice: 10000000000
        },
        mainnet: {
            network_id: "56",
            provider: () => provider("https://bsc-dataseed4.ninicoin.io/"),
            networkCheckTimeout: 1000000,
            gasPrice: 0000000000,
	    gas: 1000000
        },
        develop: {
            host: "127.0.0.1",
            port: 9545,
            network_id: "5777",
            networkCheckTimeout: 100000,
            accounts: 13,
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
                    testrpcProvider = ganache.provider({ gasLimit: "0x8000000", secure: false });
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
            version: "v0.7.6+commit.7338295f",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 999999
                }
            }
        }
    },
    mocha: {
        enableTimeouts: false,
        before_timeout: 120000, // Here is 2min but can be whatever timeout is suitable for you.
        reporter: 'eth-gas-reporter',
        reporterOptions: {}
    },

    plugins: [
        "truffle-plugin-verify"
    ],

    api_keys: {
        etherscan: nconf.get("ETHERSCAN_API_KEY")
    }
};


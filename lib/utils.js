const Web3 = require("web3");

module.exports = {

    rpcCommand: (command, params = []) => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.send({jsonrpc: "2.0", method: command, params: params}, (err, result) => {
                if (!err) {
                    resolve(result.result);
                } else {
                    reject(err);
                }
            });
        });
    },

};
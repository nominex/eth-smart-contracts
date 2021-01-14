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

    signData: async function (owner, typeData) {
        return new Promise((resolve, reject) => {
            const request = {id: 1, method: "eth_signTypedData", params: [owner, typeData], from: owner};
            web3.currentProvider.send(request, (errorMsg, response) => {
                if (errorMsg) reject(errorMsg);
                const r = response.result.slice(0, 66);
                const s = "0x" + response.result.slice(66, 130);
                const v = Number("0x" + response.result.slice(130, 132));
                resolve({v, r, s});
            });
        });
    }

};
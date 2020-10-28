const contract = require("@truffle/contract");
const provision = require("@truffle/provisioner");

module.exports = {
    requireContract: (path) => {
        const contractData = require(path);
        const contractInstance = contract(contractData);
        provision(contractInstance, config);
        return contractInstance;
    }
}
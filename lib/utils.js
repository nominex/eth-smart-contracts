const web3 = require("web3");
const contract = require("@truffle/contract");
const provision = require("@truffle/provisioner");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;

module.exports = {
    requireContract: (path) => {
        const contractData = require(path);
        const contractInstance = contract(contractData);
        provision(contractInstance, config);
        return contractInstance;
    },
    scheduleItem: (repeatCount, duration, rewardRate, periodRepeatMultiplier) => {
        return {
            repeatCount: repeatCount,
            duration: duration,
            rewardRate: "0x" + toWei(toBN(rewardRate)).divn(24 * 60 * 60).toString(16),
            periodRepeatMultiplier: "0x" + toBN(1).shln(64).muln(periodRepeatMultiplier).toString(16)
        }
    }
};
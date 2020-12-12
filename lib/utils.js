const Web3 = require("web3");
const contract = require("@truffle/contract");
const provision = require("@truffle/provisioner");

const toBN = Web3.utils.toBN;
const toWei = Web3.utils.toWei;

function to64x64(number) {
  const maxNumber = 100000;
  if (number == 0) {
    return "0x0";
  }
  const base = toBN(number > 0 ? 1 : -1);
  number = Math.abs(number);
  let divisor = 1;
  while (number < maxNumber && number != Math.trunc(number)) {
    number*=10;
    divisor*=10;
  }
  number = Math.trunc(number);
  return "0x" + base.shln(64).muln(number).divn(divisor).toString(16);
}
const DAY_IN_SECONDS = 24*60*60;
module.exports = {
    requireContract: (path, externalCfg) => {
        const contractData = require(path);
        const contractInstance = contract(contractData);
        provision(contractInstance, externalCfg || config);
        return contractInstance;
    },
    scheduleItem: ({
      repeatCount,
      duration,
      dailyRewardRate,
      repeatMultiplier,
      bonusPoolRate,
      affiliateTeamStakingPoolRate,
      fundingTeamPoolRate,
      operationalFundPoolRate,
      reserveFundPoolRate}) => {
      return {
        repeatCount: repeatCount,
        duration: duration,
        rewardRate: "0x" + toWei(toBN(dailyRewardRate)).divn(DAY_IN_SECONDS).toString(16),
        repeatMultiplier: to64x64(repeatMultiplier),
        poolRewardRates: [
          to64x64(bonusPoolRate),
          to64x64(affiliateTeamStakingPoolRate),
          to64x64(fundingTeamPoolRate),
          to64x64(operationalFundPoolRate),
          to64x64(reserveFundPoolRate)
        ]
      }
    },

    rpcCommand: (command, params = []) => {
        return new Promise((resolve, reject) => {
            web3.currentProvider.sendAsync({jsonrpc: "2.0", method: command, params: params}, (err, result) => {
                if (!err) {
                    resolve(result.result);
                } else {
                    reject(err);
                }
            });
        });
    },

};
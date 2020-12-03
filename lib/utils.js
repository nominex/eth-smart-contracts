const web3 = require("web3");
const contract = require("@truffle/contract");
const provision = require("@truffle/provisioner");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;

function to64x64(number) {
  return "0x" + toBN(1).shln(64).muln(number).toString(16);
}

module.exports = {
    requireContract: (path) => {
        const contractData = require(path);
        const contractInstance = contract(contractData);
        provision(contractInstance, config);
        return contractInstance;
    },
    scheduleItem: ({
      repeatCount,
      blockCount,
      rewardRate,
      repeatMultiplier,
      bonusPoolRate,
      affiliateTeamStakingPoolRate,
      fundingTeamPoolRate,
      operationalFundPoolRate,
      reserveFundPoolRate}) => {
        return {
          repeatCount: repeatCount,
          blockCount: blockCount,
          rewardRate: "0x" + toWei(toBN(rewardRate)).divn(24 * 60 * 60).toString(16),
          repeatMultiplier: to64x64(repeatMultiplier),
          poolRewardRates: [
            to64x64(bonusPoolRate),
            to64x64(affiliateTeamStakingPoolRate),
            to64x64(fundingTeamPoolRate),
            to64x64(operationalFundPoolRate),
            to64x64(reserveFundPoolRate)
          ]
        }
    }
};
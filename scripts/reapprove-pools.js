const Nmx = artifacts.require("Nmx");

const StakingPoolManager = artifacts.require("StakingPoolManager");
const fromWei = web3.utils.fromWei;
const toBN = web3.utils.toBN;
module.exports = async (callback) => {
  try {
    const poolManager = await StakingPoolManager.deployed();
    const nmx = await Nmx.deployed();
    const poolManagerBalance = await nmx.balanceOf(poolManager.address);
    console.log(`Current pool manager ${poolManager.address} balance ${fromWei(poolManagerBalance)}`);
    let i = 0;
    while (true) {
      let token;
      try {
        token = await poolManager.stakingTokens(i);
      } catch (e) {
        break;
      }
      if (toBN(token).isZero()) {
        break;
      }
      const stakingPoolInfo = await poolManager.stakingPools(token);
      const poolAllowance = await nmx.allowance(poolManager.address, stakingPoolInfo.poolAddress);
      console.log(`Allowance to spend from ${poolManager.address} to ${stakingPoolInfo.poolAddress} is ${fromWei(poolAllowance)}`);
      i++;
    }
    await poolManager.reapprovePools();
    console.log("Called poolManager.reapprovePools() successfully");
    callback();
  } catch (e) {
    callback(e);
  }
};

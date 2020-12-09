const ScheduleLib = artifacts.require("ScheduleLib");
const ABDKMath64x64 = artifacts.require("ABDKMath64x64");
const StakingPool = artifacts.require("StakingPool");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ScheduleLib, accounts[0]);
  deployer.link(ScheduleLib, StakingPool);
};

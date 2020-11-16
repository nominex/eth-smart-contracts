const ScheduleLib = artifacts.require("ScheduleLib");
const ABDKMath64x64 = artifacts.require("ABDKMath64x64");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(ScheduleLib, accounts[0]);
  await deployer.deploy(ABDKMath64x64, accounts[0]);
};

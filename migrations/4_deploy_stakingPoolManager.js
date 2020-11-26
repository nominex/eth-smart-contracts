const web3 = require("web3");
const { scheduleItem } = require("../lib/utils")
const Nmx = artifacts.require("Nmx");
const ScheduleLib = artifacts.require("ScheduleLib");
const StakingPoolManager = artifacts.require("StakingPoolManager");

module.exports = async function(deployer, network, accounts) {
  const nmx = await Nmx.deployed();
  await deployer.link(ScheduleLib, StakingPoolManager);
  const startTime = Math.floor((new Date().getTime())/1000);
  /* TODO: create normal schedule */
  const schedule = {
    distributionStart: startTime,
    items: [
      scheduleItem(10, 100, 100, 100)
  ]};
  await deployer.deploy(StakingPoolManager, nmx.address, schedule, {from: accounts[0]});
  await StakingPoolManager.deployed();
};

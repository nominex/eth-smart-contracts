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
    distributionStartBlock: startTime,
    items: [
      scheduleItem({
        repeatCount: 10,
        blockCount: 100,
        dailyRewardRate: 100,
        repeatMultiplier: 100,
        bonusPoolRate: 0,
        affiliateTeamStakingPoolRate: 0,
        fundingTeamPoolRate: 0,
        operationalFundPoolRate: 0,
        reserveFundPoolRate: 0})
    ]};
  await deployer.deploy(StakingPoolManager, nmx.address, schedule, {from: accounts[0]});
  await StakingPoolManager.deployed();
};

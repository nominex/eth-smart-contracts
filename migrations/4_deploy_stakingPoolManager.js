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
  const blocksPerDay = 6500;
  const schedule = {
    distributionStartBlock: startTime,
    items: [
      /*1-28*/
      scheduleItem({
        repeatCount: 4,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 10000,
        repeatMultiplier: 0.994,
        bonusPoolRate: (1-0.2)*0.1,
        affiliateTeamStakingPoolRate: 0.2,
        fundingTeamPoolRate: 0,
        operationalFundPoolRate: 0,
        reserveFundPoolRate: 0
      }),
      /*29-30*/
      scheduleItem({
        repeatCount: 1,
        blockCount: blocksPerDay * 2,
        dailyRewardRate: 0,
        repeatMultiplier: 0.994,
        bonusPoolRate: (1-0.2)*0.1,
        affiliateTeamStakingPoolRate: 0.2,
        fundingTeamPoolRate: 0,
        operationalFundPoolRate: 0,
        reserveFundPoolRate: 0
      }),
      /*31-35 end part of week 30-60*/
      scheduleItem({
        repeatCount: 1,
        blockCount: blocksPerDay * 5,
        dailyRewardRate: 0,
        repeatMultiplier: 1,
        bonusPoolRate: (1 - 0.15)*(1-0.25)*0.15,
        affiliateTeamStakingPoolRate: (1 - 0.15)*0.25,
        fundingTeamPoolRate: 0.05,
        operationalFundPoolRate: 0.05,
        reserveFundPoolRate: 0.05
      }),
      /*36-56 30-60*/
      scheduleItem({
        repeatCount: 3,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.994,
        bonusPoolRate: (1 - 0.15)*(1-0.25)*0.15,
        affiliateTeamStakingPoolRate: (1 - 0.15)*0.25,
        fundingTeamPoolRate: 0.05,
        operationalFundPoolRate: 0.05,
        reserveFundPoolRate: 0.05
      }),
      /*57-60 start part of week 30-60*/
      scheduleItem({
        repeatCount: 1,
        blockCount: blocksPerDay * 4,
        dailyRewardRate: 0,
        repeatMultiplier: 0.994,
        bonusPoolRate: (1 - 0.15)*(1-0.25)*0.15,
        affiliateTeamStakingPoolRate: (1 - 0.15)*0.25,
        fundingTeamPoolRate: 0.05,
        operationalFundPoolRate: 0.05,
        reserveFundPoolRate: 0.05
      }),
      /*61-63 end part of week*/
      scheduleItem({
        repeatCount: 1,
        blockCount: blocksPerDay * 3,
        dailyRewardRate: 0,
        repeatMultiplier: 1,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*64-182 - 0.5 year*/
      scheduleItem({
        repeatCount: 17,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.994,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*183-371 - 1 year*/
      scheduleItem({
        repeatCount: 27,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.996,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*372-735 - 2 year*/
      scheduleItem({
        repeatCount: 52,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.998,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*736-1463 - 4 year*/
      scheduleItem({
        repeatCount: 104,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.9995,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*1464-2926 - 8 year*/
      scheduleItem({
        repeatCount: 209,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.9997,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*2927-5481 - 15 year*/
      scheduleItem({
        repeatCount: 365,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.99985,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*5481-10962 - 30 year*/
      scheduleItem({
        repeatCount: 783,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.99992,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*10963-21917 - 60 year*/
      scheduleItem({
        repeatCount: 1565,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.99994,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*21917-36519 - 100 year*/
      scheduleItem({
        repeatCount: 2086,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.99995,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
      /*36520-36525 year end of week - 100*/
      scheduleItem({
        repeatCount: 1,
        blockCount: blocksPerDay * 7,
        dailyRewardRate: 0,
        repeatMultiplier: 0.99995,
        bonusPoolRate: (1 - 0.3)*(1 - 0.3)*0.2,
        affiliateTeamStakingPoolRate: (1 - 0.3)*0.3,
        fundingTeamPoolRate: 0.1,
        operationalFundPoolRate: 0.1,
        reserveFundPoolRate: 0.1
      }),
    ]};
  await deployer.deploy(StakingPoolManager, nmx.address, {from: accounts[0]});
  const stakingPoolManager = await StakingPoolManager.deployed();
  config.logger.info("Setting staking reward schedule");
  await stakingPoolManager.setSchedule(schedule, {from: accounts[0]});
};

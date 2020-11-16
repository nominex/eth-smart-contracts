const Web3 = require("web3");
const Nmx = artifacts.require("Nmx");
const ScheduleLib = artifacts.require("ScheduleLib");
const ABDKMath64x64 = artifacts.require("ABDKMath64x64");
const StakingPoolManager = artifacts.require("StakingPoolManager");
const StakingPool = artifacts.require("StakingPool");

module.exports = async function(deployer, network, accounts) {
  const nmx = await Nmx.deployed();
  // await deployer.deploy(ScheduleLib, accounts[0]);
  await deployer.link(ScheduleLib, StakingPoolManager);
  // await deployer.deploy(ABDKMath64x64, accounts[0]);
  await deployer.link(ABDKMath64x64, StakingPoolManager);
  const startTime = Math.floor((new Date().getTime())/1000);
  const schedule = {distributionStart: startTime, items: [{
    repeatCount: 10,
    duration: 100,
    rewardRate: 100,
    periodRepeatMultiplier: 100
  }]};
  await deployer.deploy(StakingPoolManager, nmx.address, schedule, {from: accounts[0]});
  const manager = await StakingPoolManager.deployed();
  await manager.addPool(nmx.address);
  console.log("Pool added");
  const poolInfo = await manager.getStakingPoolInfo(nmx.address);
  console.log("Got pool info, poolAddress:" + poolInfo.poolAddress);
  const stakingPool = await StakingPool.at(poolInfo.poolAddress);
  console.log("Approving nmx to pool");
  await nmx.approve(stakingPool.address, 50000000);
  console.log("Staking nmx");
  const stakeReceipt = await stakingPool.stake(50000000);
  console.log("Staked nmx, tx: " + stakeReceipt.tx);
  console.log("Unstaking nmx");
  const unstakeReceipt = await stakingPool.unstake(50000000);
  console.log("Unstaked nmx, tx:" + unstakeReceipt.tx);
  console.log("Success");
  console.log(await manager.getStakingPoolInfo(nmx.address));
};

const Nmx = artifacts.require("Nmx");
const StakingPool = artifacts.require("StakingPool");
const ScheduleLib = artifacts.require("ScheduleLib");
const {scheduleItem, msBetweenBlocks, evmSnapshot, evmReset, evmMine} = require("../lib/utils.js");

let toBN = web3.utils.toBN;
let toWei = web3.utils.toWei;
let fromWei = web3.utils.fromWei;

async function printInfo(action, {accounts, stakingToken, nmx, stakingPool}) {
/*  let stakingTokenBalance0 = fromWei(await stakingToken.balanceOf(accounts[0]));
  let nmxBalance0 = fromWei(await nmx.balanceOf(accounts[0]));
  let stakingTokenBalance1 = fromWei(await stakingToken.balanceOf(accounts[1]));
  let nmxBalance1 = fromWei(await nmx.balanceOf(accounts[1]));
  console.log(`===============${action}===============`);
  console.log(`lp0: ${stakingTokenBalance0}`);
  console.log(`nmx0: ${nmxBalance0}`);
  console.log(`lp1: ${stakingTokenBalance1}`);
  console.log(`nmx1: ${nmxBalance1}`);
  console.log(`active: ${await stakingPool.active() }`);
  console.log(`totalStaked: ${await stakingPool.totalStaked() }`);
  console.log(`profitability: ${await stakingPool.profitability() }`);
  console.log(`lastUpdateBlock: ${await stakingPool.lastUpdateBlock() }`);

  console.log(`scheduleItemIndex: ${await stakingPool.scheduleItemIndex()}`);
  console.log(`scheduleItemStartBlockNumber: ${await stakingPool.scheduleItemStartBlockNumber()}`);
  console.log(`repeatCount: ${await stakingPool.scheduleItemRepeatCount()}`);
  console.log(`rewardRate: ${await stakingPool.rewardRate()}`);
*/
}
contract('StakingPool', (accounts) => {

  let nmx;
  let stakingToken;
  let stakingPool;
  let snapshotId;

  before(async () => {
    nmx = await Nmx.deployed();
    stakingToken = await Nmx.new();
    stakingPool = await StakingPool.new(nmx.address, stakingToken.address);
    await nmx.approve(stakingPool.address, toWei(toBN(200000000)));
  });

  beforeEach(async () => {
    snapshotId = await evmSnapshot();
  });

  afterEach(async () => {
    await evmReset(snapshotId);
  });

  it('should calculate reward according to reward schedule', async () => {
    const lastBlock = await web3.eth.getBlockNumber();
    let dailyRewardRate = 100;
    const schedule = {
      distributionStartBlock: lastBlock,
      items: [
        scheduleItem(
          {
            repeatCount: 10,
            blockCount: 100,
            dailyRewardRate: dailyRewardRate,
            repeatMultiplier: 0.97,
            bonusPoolRate: 0,
            affiliateTeamStakingPoolRate: 0,
            fundingTeamPoolRate: 0,
            operationalFundPoolRate: 0,
            reserveFundPoolRate: 0
          }
        )
      ]
    };
    await stakingPool.setRewardSchedule(schedule);
    const infoData = {accounts: accounts, stakingToken: stakingToken, nmx: nmx, stakingPool: stakingPool};

    await printInfo("activating", infoData);
    await stakingPool.activate();

    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

    await printInfo("staking", infoData);
    const stakeTxOutcome = await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

    await printInfo("unstaking", infoData);
    const unstakeTxOutcome = await stakingPool.unstake(toWei(toBN(10)), {from: accounts[1]});

    await printInfo("claiming reward", infoData);
    await stakingPool.claimReward({from: accounts[1]});

    const account1NmxBalance = fromWei(await (nmx.balanceOf(accounts[1])));

    const stakeBlock = stakeTxOutcome.receipt.blockNumber;

    const unstakeBlock = unstakeTxOutcome.receipt.blockNumber;

    const stakeDurationMs = msBetweenBlocks(unstakeBlock - stakeBlock);

    await printInfo("done", infoData);
    assert(Math.abs(1 - account1NmxBalance / (dailyRewardRate * stakeDurationMs / (24 * 60 * 60 * 1000))) < 1e-10, "Wrong reward calculation");

  });

  it('schedule items shoud be iterated unitil current end of the staking', async () => {
    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

    const lastBlock = await web3.eth.getBlockNumber();

    let dailyRewardRate = 6500;

    const schedule = {
      distributionStartBlock: lastBlock,
      items: [
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate * 2,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
      ]
    };

    await stakingPool.setRewardSchedule(schedule);
    await stakingPool.activate();

    await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

    async function mineAndVerifyReward(blocksToMine, reward) {
      [...Array(blocksToMine).keys()].forEach(evmMine);
      {
        const rewardInWei = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
        assert.equal(reward, fromWei(rewardInWei));
      }
    }

    /* 3 blocks already mined*/
    await mineAndVerifyReward(5, 5);
    await mineAndVerifyReward(2, 7);
    await mineAndVerifyReward(2, 8);
    await mineAndVerifyReward(8, 12);
    await mineAndVerifyReward(5, 22);
    await mineAndVerifyReward(5, 32);
    await mineAndVerifyReward(5, 37);
    await mineAndVerifyReward(5, 42);
    await mineAndVerifyReward(5, 42);

    await stakingPool.claimReward({from: accounts[1]});
    const account1NmxBalance = await (nmx.balanceOf(accounts[1]));
    assert.equal(42, fromWei(account1NmxBalance));
  });

  it('reward is distributed proportional to staked amount', async () => {
    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});
    await stakingToken.transfer(accounts[2], toWei(toBN(40)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(40)), {from: accounts[2]});

    const lastBlock = await web3.eth.getBlockNumber();

    let dailyRewardRate = 6500;

    const schedule = {
      distributionStartBlock: lastBlock,
      items: [
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate * 2,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
      ]
    };

    await stakingPool.setRewardSchedule(schedule);
    await stakingPool.activate();

    await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});
    assert.equal(10, fromWei(await stakingPool.totalStaked()));
    {
      const rewardInWeiFor1 = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
      assert.equal(0, fromWei(rewardInWeiFor1));
    }
    await stakingPool.stake(toWei(toBN(40)), {from: accounts[2]});
    assert.equal(50, fromWei(await stakingPool.totalStaked()));

    async function mineAndVerifyRewards(blocksToMine, account1Reward, account2Reward) {
      [...Array(blocksToMine).keys()].forEach(evmMine);
      {
        const rewardInWeiFor1 = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
        assert.equal(account1Reward, fromWei(rewardInWeiFor1));
        const rewardInWeiFor2 = await stakingPool.getUnclaimedReward.call({from: accounts[2]});
        assert.equal(account2Reward, fromWei(rewardInWeiFor2));
      }
    }
    /* 4 blocks already mined*/
    await mineAndVerifyRewards(0, 1, 0);
    await mineAndVerifyRewards(1, 1.2, 0.8);
    await mineAndVerifyRewards(1, 1.4, 1.6);
    await stakingPool.unstake(toWei(toBN(40)), {from: accounts[2]});
    await mineAndVerifyRewards(0, 1.6, 2.4);
    await mineAndVerifyRewards(1, 2.6, 2.4);
  });

  it('reward is is not distributed when pool is inactive', async () => {
    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

    const lastBlock = await web3.eth.getBlockNumber();

    let dailyRewardRate = 6500;

    const schedule = {
      distributionStartBlock: lastBlock,
      items: [
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate * 2,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
      ]
    };

    await stakingPool.setRewardSchedule(schedule);
    await stakingPool.activate();

    await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

    async function mineAndVerifyReward(blocksToMine, reward) {
      [...Array(blocksToMine).keys()].forEach(evmMine);
      {
        const rewardInWei = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
        assert.equal(reward, fromWei(rewardInWei));
      }
    }

    /* 3 blocks already mined*/
    await mineAndVerifyReward(1, 1);
    await stakingPool.deactivate();
    await mineAndVerifyReward(0, 2);
    await mineAndVerifyReward(1, 2);
    await stakingPool.activate();
    await mineAndVerifyReward(0, 2);
    await mineAndVerifyReward(1, 3);
  });

  it('nominex pools are distributed according to schedule', async () => {
    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

    const
      BONUS_POOL = 0,
      AFFILIATE_TEAM_STAKING_POOL = 1,
      FUNDING_TEAM_POOL = 2,
      OPERATIONAL_FUND_POOL = 3,
      RESERVE_FUND_POOL = 4;

    await stakingPool.setPoolOwner(BONUS_POOL, accounts[2]);

    let dailyRewardRate = 6500;

    const lastBlock = await web3.eth.getBlockNumber();
    const schedule = {
      distributionStartBlock: lastBlock,
      items: [
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0.4,
          affiliateTeamStakingPoolRate: 0,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
        scheduleItem({
          repeatCount: 2,
          blockCount: 10,
          dailyRewardRate: dailyRewardRate * 2,
          repeatMultiplier: 0.5,
          bonusPoolRate: 0,
          affiliateTeamStakingPoolRate: 0.3,
          fundingTeamPoolRate: 0,
          operationalFundPoolRate: 0,
          reserveFundPoolRate: 0
        }),
      ]
    };

    await stakingPool.setRewardSchedule(schedule);
    await stakingPool.activate();

    await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

    async function mineAndVerifyReward(blocksToMine, reward, poolId, poolReward) {
      [...Array(blocksToMine).keys()].forEach(evmMine);
      {
        const rewardInWei = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
        assert.equal(reward, fromWei(rewardInWei));
      }
      {
        const prReward = await stakingPool.getPoolReward.call(poolId);
        assert(Math.abs(poolReward - fromWei(prReward)) < 1e-10);
      }
    }

    /* 3 blocks already mined*/
    await mineAndVerifyReward(0, 0, BONUS_POOL, 0);
    await mineAndVerifyReward(1, 0.6, BONUS_POOL, 0.4);
    await mineAndVerifyReward(6, 7*0.6, BONUS_POOL, 7*0.4);
    await mineAndVerifyReward(10, 7*0.6 + 10*0.6*0.5, BONUS_POOL, 7*0.4 + 10*0.4*0.5);
    await mineAndVerifyReward(10, (7*0.6 + 10*0.6*0.5) + 10*0.7*2, AFFILIATE_TEAM_STAKING_POOL, 10*0.3*2);
    await stakingPool.claimPoolReward({from: accounts[2]});
    const poolOwnerBalance = await nmx.balanceOf(accounts[2]);
    assert (Math.abs(fromWei(poolOwnerBalance) - (7*0.4 + 10*0.4*0.5)) < 1e-10);
  });


});
const Nmx = artifacts.require("Nmx");
const StakingPool = artifacts.require("StakingPool");
const ScheduleLib = artifacts.require("ScheduleLib");
const {scheduleItem, msBetweenBlocks} = require("../lib/utils.js");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let toBN = web3.utils.toBN;
let toWei = web3.utils.toWei;
let fromWei = web3.utils.fromWei;

async function printInfo(action, {accounts, stakingToken, nmx, stakingPool}) {
  let stakingTokenBalance0 = fromWei(await stakingToken.balanceOf(accounts[0]));
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

}

contract('StakingPool', (accounts) => {

  it('should calculate reward according to reward schedule', async () => {
    const nmx = await Nmx.deployed();
    const stakingToken = await Nmx.new();
    const stakingPool = await StakingPool.new(nmx.address, stakingToken.address);
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
    await nmx.approve(stakingPool.address, toWei(toBN(10)));
    const infoData = {accounts: accounts, stakingToken: stakingToken, nmx: nmx, stakingPool: stakingPool};

    await printInfo("activating", infoData);
    await stakingPool.activate();

    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

    await printInfo("staking", infoData);
    const stakeTxOutcome = await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

    let sleepTimeSec = 10;
    await sleep(sleepTimeSec * 1000);

    await printInfo("unstaking", infoData);
    const unstakeTxOutcome = await stakingPool.unstake(toWei(toBN(10)), {from: accounts[1]});

    await printInfo("claiming reward", infoData);
    await stakingPool.claimReward({from: accounts[1]});

    const account1NmxBalance = fromWei(await (nmx.balanceOf(accounts[1])));

    const stakeBlock = stakeTxOutcome.receipt.blockNumber;

    const unstakeBlock = unstakeTxOutcome.receipt.blockNumber;

    const stakeDurationMs = msBetweenBlocks(unstakeBlock - stakeBlock);
    await new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: 12345
      }, function(err, result) {
        if (!err) {
          resolve(result);
        } else {
          reject(err);
        }
      });
    });

    await printInfo("done", infoData);
    assert(Math.abs(1 - account1NmxBalance / (dailyRewardRate * stakeDurationMs / (24 * 60 * 60 * 1000))) < 1e-10, "Wrong reward calculation");

  });

/*  it('should use next schedule item i first is over', async () => {
    const nmx = await Nmx.deployed();
    const stakingToken = await Nmx.new();
    const stakingPool = await StakingPool.new(nmx.address, stakingToken.address);
    const startTime = Math.trunc((new Date().getTime() + 999) / 1000);
    let rewardRate = 100;
    const schedule = {
      distributionStartBlock: startTime,
      items: [
        scheduleItem(100, 4, rewardRate, 0.25),
        scheduleItem(10, 100, rewardRate * 10, 0.97)
      ]
    };
    await stakingPool.setRewardSchedule(schedule);
    await nmx.approve(stakingPool.address, toWei(toBN(10)));
    const infoData = {accounts: accounts, stakingToken: stakingToken, nmx: nmx, stakingPool: stakingPool};

    await printInfo("activating", infoData);
    await stakingPool.activate();

    await stakingToken.transfer(accounts[1], toWei(toBN(10)));
    await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

    await printInfo("staking", infoData);
    const stakeTxOutcome = await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

    let sleepTimeSec = 10;
    await sleep(sleepTimeSec * 1000);

    await printInfo("unstaking", infoData);
    const unstakeTxOutcome = await stakingPool.unstake(toWei(toBN(10)), {from: accounts[1]});

    await printInfo("claiming reward", infoData);
    await stakingPool.claimReward({from: accounts[1]});

    const account1NmxBalance = fromWei(await (nmx.balanceOf(accounts[1])));

    const stakeBlock = stakeTxOutcome.receipt.blockHash;
    const stakeTimestamp = (await web3.eth.getBlock(stakeBlock)).timestamp;

    const unstakeBlock = unstakeTxOutcome.receipt.blockHash;
    const unstakeTimestamp = (await web3.eth.getBlock(unstakeBlock)).timestamp;
    const stakeDuration = unstakeTimestamp - stakeTimestamp;

    await printInfo("done", infoData);
    //TODO check times//
    // for (let i = startTime; i < stakeBlock)
    // const rewardAmount= (stakeBlock - startTime);
    // const rewardAmount= (stakeBlock - startTime);
    // assert(Math.abs(1 - account1NmxBalance / (rewardRate * stakeDuration / (24 * 60 * 60))) < 1e-10, "Wrong reward calculation");

  });
*/
});

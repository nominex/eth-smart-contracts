const Nmx = artifacts.require("Nmx");
const StakingPool = artifacts.require("StakingPool");
const {scheduleItem, rpcCommand} = require("../../lib/utils.js");

let toBN = web3.utils.toBN;
let toWei = web3.utils.toWei;
let fromWei = web3.utils.fromWei;

contract('StakingPool', (accounts) => {

    let nmx;
    let stakingToken;
    let stakingPool;
    let snapshotId;

    async function sleep(duration) {
        await new Promise((resolve, reject) => setTimeout(resolve, duration));
    }

    before(async () => {
        nmx = await Nmx.deployed();
        stakingToken = await Nmx.new();
        stakingPool = await StakingPool.new(nmx.address, stakingToken.address);
        await nmx.approve(stakingPool.address, toWei(toBN(200000000)));
    });

    beforeEach(async () => {
        snapshotId = await rpcCommand("evm_snapshot");
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('should calculate reward according to reward schedule', async () => {
        let dailyRewardRate = 100;
        const schedule = {
            distributionStart: Math.trunc(new Date().getTime() / 1000),
            items: [
                scheduleItem(
                    {
                        repeatCount: 10,
                        duration: 100,
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

        await stakingPool.activate();

        await stakingToken.transfer(accounts[1], toWei(toBN(10)));
        await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

        const stakeTxOutcome = await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

        rpcCommand("evm_increaseTime", 10);

        const unstakeTxOutcome = await stakingPool.unstake(toWei(toBN(10)), {from: accounts[1]});

        await stakingPool.claimReward({from: accounts[1]});

        const account1NmxBalance = fromWei(await (nmx.balanceOf(accounts[1])));

        const stakeBlockHash = stakeTxOutcome.receipt.blockHash;
        const stakeBlock = await web3.eth.getBlock(stakeBlockHash);
        const stakeBlockTime = stakeBlock.timestamp;

        const unstakeBlockHash = unstakeTxOutcome.receipt.blockHash;
        const unstakeBlock = await web3.eth.getBlock(unstakeBlockHash);
        const unstakeBlockTime = unstakeBlock.timestamp;

        const stakeDuration = unstakeBlockTime - stakeBlockTime;

        assert(Math.abs(1 - account1NmxBalance / (dailyRewardRate * stakeDuration / (24 * 60 * 60))) < 1e-10, "Wrong reward calculation");
    });

    it('schedule items shoud be iterated until end of the staking', async () => {
        await stakingToken.transfer(accounts[1], toWei(toBN(10)));
        await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

        let dailyRewardRate = 24*60*60;

        let timestamp = Math.trunc(new Date().getTime() / 1000) + 10;
        const schedule = {
            distributionStart: timestamp,
            items: [
                scheduleItem({
                    repeatCount: 2,
                    duration: 10,
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
                    duration: 10,
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

        await rpcCommand("evm_increaseTime", -10);
        await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

        async function increaseTimeAndVerifyReward(timeToDelay, reward) {
            timestamp += timeToDelay;
            await rpcCommand("evm_mine", [timestamp]);
            const rewardInWei = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
            assert.equal(reward, fromWei(rewardInWei));
        }

        await increaseTimeAndVerifyReward(5, 5);
        await increaseTimeAndVerifyReward(5, 10);
        await increaseTimeAndVerifyReward(2, 11);
        await increaseTimeAndVerifyReward(8, 15);
        await increaseTimeAndVerifyReward(5, 25);
        await increaseTimeAndVerifyReward(5, 35);
        await increaseTimeAndVerifyReward(5, 40);
        await increaseTimeAndVerifyReward(5, 45);
        await increaseTimeAndVerifyReward(10, 45);

        await stakingPool.claimReward({from: accounts[1]});
        const account1NmxBalance = await (nmx.balanceOf(accounts[1]));
        assert.equal(45, fromWei(account1NmxBalance));
    });

    it('reward is distributed proportional to staked amount', async () => {
        await stakingToken.transfer(accounts[1], toWei(toBN(10)));
        await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});
        await stakingToken.transfer(accounts[2], toWei(toBN(40)));
        await stakingToken.approve(stakingPool.address, toWei(toBN(40)), {from: accounts[2]});

        let timestamp = Math.trunc(new Date().getTime() / 1000) + 10;

        let dailyRewardRate = 24*60*60;

        const schedule = {
            distributionStart: timestamp,
            items: [
                scheduleItem({
                    repeatCount: 2,
                    duration: 10,
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
                    duration: 10,
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

        await rpcCommand("evm_increaseTime", -10);
        await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});
        assert.equal(10, fromWei(await stakingPool.totalStaked()));
        {
            const rewardInWeiFor1 = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
            assert.equal(0, fromWei(rewardInWeiFor1));
        }
        timestamp += 1;
        await rpcCommand("evm_mine", [timestamp]);
        await stakingPool.stake(toWei(toBN(40)), {from: accounts[2]});
        assert.equal(50, fromWei(await stakingPool.totalStaked()));

        async function increaseTimeAndVerifyReward(delay, account1Reward, account2Reward) {
            timestamp += delay;
            await rpcCommand("evm_mine", [timestamp]);
            const rewardInWeiFor1 = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
            assert.equal(account1Reward, fromWei(rewardInWeiFor1));
            await rpcCommand("evm_mine", [timestamp]);
            const rewardInWeiFor2 = await stakingPool.getUnclaimedReward.call({from: accounts[2]});
            assert.equal(account2Reward, fromWei(rewardInWeiFor2));
        }

        await increaseTimeAndVerifyReward(0, 1, 0);
        await increaseTimeAndVerifyReward(1, 1.2, 0.8);
        await increaseTimeAndVerifyReward(1, 1.4, 1.6);
        await stakingPool.unstake(toWei(toBN(40)), {from: accounts[2]});
        await increaseTimeAndVerifyReward(0, 1.4, 1.6);
        await increaseTimeAndVerifyReward(1, 2.4, 1.6);
    });

    it('reward is is not distributed when pool is inactive', async () => {
        await stakingToken.transfer(accounts[1], toWei(toBN(10)));
        await stakingToken.approve(stakingPool.address, toWei(toBN(10)), {from: accounts[1]});

        let timestamp = Math.trunc(new Date().getTime() / 1000) + 10;

        let dailyRewardRate = 24*60*60;

        const schedule = {
            distributionStart: timestamp,
            items: [
                scheduleItem({
                    repeatCount: 2,
                    duration: 10,
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
                    duration: 10,
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

        await rpcCommand("evm_increaseTime", -10);
        await stakingPool.stake(toWei(toBN(10)), {from: accounts[1]});

        async function increaseTimeAndVerifyReward(timeToDelay, reward) {
            timestamp += timeToDelay;
            await rpcCommand("evm_mine", [timestamp]);
            const rewardInWei = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
            assert.equal(reward, fromWei(rewardInWei));
        }

        /* 3 blocks already mined*/
        await increaseTimeAndVerifyReward(1, 1);
        await rpcCommand("evm_increaseTime", -1);
        await stakingPool.deactivate();
        await increaseTimeAndVerifyReward(0, 1);
        await increaseTimeAndVerifyReward(1, 1);
        await rpcCommand("evm_increaseTime", -1);
        await stakingPool.activate();
        await increaseTimeAndVerifyReward(0, 1);
        await increaseTimeAndVerifyReward(1, 2);
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

        let dailyRewardRate = 24*60*60;

        let timestamp = Math.trunc(new Date().getTime() / 1000) + 10;

        const schedule = {
            distributionStart: timestamp,
            items: [
                scheduleItem({
                    repeatCount: 2,
                    duration: 10,
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
                    duration: 10,
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

        async function increaseTimeAndVerifyReward(timeToDelay, reward, poolId, poolReward) {
            timestamp += timeToDelay;
            await rpcCommand("evm_mine", [timestamp]);
            const rewardInWei = await stakingPool.getUnclaimedReward.call({from: accounts[1]});
            assert.equal(reward, fromWei(rewardInWei));
            const prReward = await stakingPool.getPoolReward.call(poolId);
            assert.equal(poolReward, fromWei(prReward));
        }

        /* 3 blocks already mined*/
        await increaseTimeAndVerifyReward(0, 0, BONUS_POOL, 0);
        await increaseTimeAndVerifyReward(1, 0.6, BONUS_POOL, 0.4);
        await increaseTimeAndVerifyReward(6, 7 * 0.6, BONUS_POOL, 2.8);
        await increaseTimeAndVerifyReward(10, 10 * 0.6 + 7 * 0.6 * 0.5, BONUS_POOL, 10 * 0.4 + 7 * 0.4 * 0.5);
        await increaseTimeAndVerifyReward(10, 18.8, AFFILIATE_TEAM_STAKING_POOL, 7 * 0.3 * 2);
        await stakingPool.claimPoolReward({from: accounts[2]});
        const poolOwnerBalance = await nmx.balanceOf(accounts[2]);
        assert(Math.abs(fromWei(poolOwnerBalance) - (10 * 0.4 + 10 * 0.4 * 0.5)) < 1e-10);
    });


});
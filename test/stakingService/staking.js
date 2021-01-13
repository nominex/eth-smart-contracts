const Nmx = artifacts.require("Nmx");
const MockedStakingToken = artifacts.require("MockedStakingToken");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");
const { rpcCommand } = require("../../lib/utils.js");
const truffleAssert = require('truffle-assertions');

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract('StakingService', (accounts) => {

    const initialBalance = 1000;

    let nmx;
    let stakingToken;
    let stakingService;
    let snapshotId;
    let stakingRouter;

    before(async () => {
        nmx = await Nmx.deployed();

        stakingToken = await MockedStakingToken.new();

        stakingRouter = await StakingRouter.new(nmx.address);
        nmx.transferPoolOwnership(1, stakingRouter.address);

        stakingService = await StakingService.new(nmx.address, stakingToken.address, stakingRouter.address);
        stakingRouter.changeStakingServiceShares(new Array(stakingService.address), new Array(1).fill(1));

        await stakingToken.transfer(accounts[1], toWei(toBN(initialBalance)));
        await stakingToken.approve(stakingService.address, toWei(toBN(initialBalance)), { from: accounts[1] });
        await stakingToken.transfer(accounts[3], toWei(toBN(100)));
        await stakingToken.approve(stakingService.address, toWei(toBN(50)), { from: accounts[3] });
        await stakingToken.transfer(accounts[4], toWei(toBN(50)));
        await stakingToken.approve(stakingService.address, toWei(toBN(100)), { from: accounts[4] });
        snapshotId = await rpcCommand("evm_snapshot");
    });

    beforeEach(async () => {
        await verifyStakedAmount(0);
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('stake', async () => {
        await stakeAndVerify(10, 10);
    });

    it('unstake', async () => {
        await stakeAndVerify(10, 10);
        await unstakeAndVerify(10, 0);
    });


    it('unstake more than staked', async () => {
        try {
            await stakeAndVerify(10, 10);
            await unstake(11);
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("NOT_ENOUGH_STAKED"), error.message);
            await verifyStakedAmount(10);
        }
    });

    it('stake in 2 stages', async () => {
        await stakeAndVerify(10, 10);
        await stakeAndVerify(6, 16);
        await unstakeAndVerify(16, 0);
    });

    it('unstake in 2 stages', async () => {
        await stakeAndVerify(10, 10);
        await unstakeAndVerify(6, 4);
        await unstakeAndVerify(4, 0);
    });

    it('stake/unstake with 0 amount', async () => {
        await stakeAndVerify(0, 0);
        await unstakeAndVerify(0, 0);

        await stakeAndVerify(5, 5);

        await unstakeAndVerify(0, 5);
        await unstakeAndVerify(0, 5);
    });

    it('unstake with 0 balance', async () => {
        try {
            await unstake(1);
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("NOT_ENOUGH_STAKED"), error.message);
        }
    });

    it('stake negative amount', async () => {
        try {
            await stake(-1);
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("INVALID_ARGUMENT"), error.message);
        }
    });

    it('unstake negative amount', async () => {
        try {
            await unstake(-1);
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("INVALID_ARGUMENT"), error.message);
        }
    });

    it('stake when paused', async () => {
        try {
            await stakingService.pause();
            await stakeAndVerify(10, 10);
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("Pausable: paused"), error.message);
        }
    });

    it('unstake when paused and stake after unpause', async () => {
        await stakeAndVerify(10, 10);
        await stakingService.pause();
        await unstakeAndVerify(4, 6);

        await stakingService.unpause();
        await stakeAndVerify(14, 20);
        await unstakeAndVerify(5, 15);
        await stakingService.pause();
        await unstakeAndVerify(15, 0);
    });

    it('stake not allowed amount', async () => {
        await stakingService.stakeFrom(accounts[3], toWei(toBN(49)), { from: accounts[2] });
        assert.equal(49, fromWei((await stakingService.stakers(accounts[3])).amount), "staked amount");
        assert.equal(49, fromWei(await stakingToken.balanceOf(stakingService.address)), "stakingService balance");
        assert.equal(51, fromWei(await stakingToken.balanceOf(accounts[3])), "account3 balance");

        try {
            await stakingService.stakeFrom(accounts[3], toWei(toBN(2)), { from: accounts[2] });
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("transfer amount exceeds allowance"), error.message);
        }
    });

    it('stake when not enough balance', async () => {
        await stakingService.stakeFrom(accounts[4], toWei(toBN(49)), { from: accounts[2] });
        assert.equal(49, fromWei((await stakingService.stakers(accounts[4])).amount), "staked amount");
        assert.equal(49, fromWei(await stakingToken.balanceOf(stakingService.address)), "stakingService balance");
        assert.equal(1, fromWei(await stakingToken.balanceOf(accounts[4])), "account4 balance");

        try {
            await stakingService.stakeFrom(accounts[4], toWei(toBN(2)), { from: accounts[2] });
            throw new Error("Error not occurred");
        } catch (error) {
            assert(error.message.includes("transfer amount exceeds balance"), error.message);
        }
    });

    it('total staked', async () => {
        await stakingService.stakeFrom(accounts[1], toWei(toBN(40)), { from: accounts[2] });
        assert.equal(40, fromWei((await stakingService.state()).totalStaked), "totalStaked");
        assert.equal(0, fromWei((await stakingService.state()).historicalRewardRate), "totalStaked");

        await stakingService.stakeFrom(accounts[3], toWei(toBN(20)), { from: accounts[2] });
        await stakingService.unstake(toWei(toBN(5)), { from: accounts[1] });
        assert.equal(55, fromWei((await stakingService.state()).totalStaked), "totalStaked");
        assert.equal(0, fromWei((await stakingService.state()).historicalRewardRate), "totalStaked");

        await stakingService.stakeFrom(accounts[4], toWei(toBN(30)), { from: accounts[2] });
        await stakingService.unstake(toWei(toBN(5)), { from: accounts[3] });
        assert.equal(80, fromWei((await stakingService.state()).totalStaked), "totalStaked");
        assert.equal(0, fromWei((await stakingService.state()).historicalRewardRate), "totalStaked");
    });

    async function getStakedBalance() {
        return (await stakingService.stakers(accounts[1])).amount;
    }

    async function verifyStakedAmount(expectedBalance) {
        assert.equal(expectedBalance, fromWei(await getStakedBalance()), "staked amount");
        assert.equal(expectedBalance, fromWei(await stakingToken.balanceOf(stakingService.address)), "stakingService balance");
        assert.equal(initialBalance - expectedBalance, fromWei(await stakingToken.balanceOf(accounts[1])), "account1 balance");
    }

    async function stake(amountToStake) {
        return await stakingService.stakeFrom(accounts[1], toWei(toBN(amountToStake)), { from: accounts[2] });
    }

    async function unstake(amountToUnstake) {
        return await stakingService.unstake(toWei(toBN(amountToUnstake)), { from: accounts[1] });
    }

    async function stakeAndVerify(amountToStake, expectedBalance) {
        let tx = await stake(amountToStake);
        await verifyStakedAmount(expectedBalance);
        truffleAssert.eventEmitted(tx, 'Staked', (ev) => {
            return ev.owner === accounts[1] && fromWei(ev.amount) === amountToStake.toString();
        });
    }

    async function unstakeAndVerify(amountToUnstake, expectedBalance) {
        let tx = await unstake(amountToUnstake);
        await verifyStakedAmount(expectedBalance);
        truffleAssert.eventEmitted(tx, 'Unstaked', (ev) => {
            return ev.owner === accounts[1] && fromWei(ev.amount) === amountToUnstake.toString();
        });
    }

});

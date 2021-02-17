const Nmx = artifacts.require("Nmx");
const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedBinaryMintSchedule = artifacts.require("MockedBinaryMintSchedule");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");
const { rpcCommand } = require("./utils.js");

contract('Integration', (accounts) => {

    let nmx;
    let stakingToken;
    let stakingService;
    let snapshotId;
    let stakingRouter;

    const day = 24 * 60 * 60;
    const now = Math.floor(new Date().getTime() / 1000);

    before(async () => {
        const mockedBinaryMintSchedule = await MockedBinaryMintSchedule.new();
        nmx = await Nmx.new(mockedBinaryMintSchedule.address);
        let usdtToken = await MockedUsdtToken.new();
        stakingToken = await MockedStakingToken.new(usdtToken.address);

        stakingRouter = await StakingRouter.new(nmx.address);
        nmx.transferPoolOwnership(1, stakingRouter.address);

        stakingService = await StakingService.new(nmx.address, stakingToken.address, stakingRouter.address);
        await stakingRouter.changeStakingServiceShares([stakingService.address], [1n << 64n]);

        await stakingToken.transfer(accounts[3], 500);
        await stakingToken.approve(stakingService.address, 500, {from: accounts[3]});
        // so that the totalStacked is filled and the supplied NMX is not transferred to the owner
        await stakingService.stakeFrom(accounts[3], 10);
    });

    beforeEach(async () => {
        // snaphot must be taken before each test because of the issue in ganache
        // evm_revert also deletes the saved snapshot
        // https://github.com/trufflesuite/ganache-cli/issues/138
        snapshotId = await rpcCommand("evm_snapshot");
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('stakingService uses block.timestamp', async () => {
        assert.equal(await nmx.balanceOf(stakingService.address), 0);
        await stakingService.updateHistoricalRewardRate();
        assert.equal(await nmx.balanceOf(stakingService.address), 1);
    });

    it('endTime used when correct param passed', async () => {
        assert.equal(await nmx.balanceOf(stakingRouter.address), 1);
        await stakingRouter.supplyNmx(now - day);
        assert.equal(await nmx.balanceOf(stakingRouter.address), 3);
    });

    it('block.timestamp used when endTime > now', async () => {
        assert.equal(await nmx.balanceOf(stakingRouter.address), 1);
        await stakingRouter.supplyNmx(now + day);
        assert.equal(await nmx.balanceOf(stakingRouter.address), 2);
    });

});
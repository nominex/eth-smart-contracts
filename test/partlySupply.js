const Nmx = artifacts.require("Nmx");
const MockedStakingToken = artifacts.require("MockedStakingToken");
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
        stakingToken = await MockedStakingToken.new();

        stakingRouter = await StakingRouter.new(nmx.address);
        nmx.transferPoolOwnership(1, stakingRouter.address);

        stakingService = await StakingService.new(nmx.address, stakingToken.address, stakingRouter.address);
        await stakingRouter.changeStakingServiceShares([stakingService.address], [1n << 64n]);
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
        assert.equal(await nmx.balanceOf(stakingService.address), 0)
        await stakingService.updateHistoricalRewardRate();
        assert.equal(await nmx.balanceOf(stakingService.address), 1);
    });

    it('endTime used when correct param passed', async () => {
        assert.equal(await nmx.balanceOf(stakingRouter.address), 0)
        await stakingRouter.supplyNmx(now - day);
        assert.equal(await nmx.balanceOf(stakingRouter.address), 2);
    });

    it('block.timestamp used when endTime > now', async () => {
        assert.equal(await nmx.balanceOf(stakingRouter.address), 0)
        await stakingRouter.supplyNmx(now + day);
        assert.equal(await nmx.balanceOf(stakingRouter.address), 1);
    });

});
const Nmx = artifacts.require("Nmx");
const StakingToken = artifacts.require("ERC20");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");

module.exports = async function (deployer, network, accounts) {
    let nmx = await Nmx.deployed();
    nmx.transferPoolOwnership(1, StakingRouter.address); // 1 - PRIMARY
    let stakingRouter = await StakingRouter.deployed();
    stakingRouter.changeStakingServiceShares([StakingService.address], [1 << 64]);
}
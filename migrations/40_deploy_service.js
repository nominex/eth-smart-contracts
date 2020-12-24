const Nmx = artifacts.require("Nmx");
const StakingToken = artifacts.require("ERC20");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");

module.exports = async function (deployer, network, accounts) {
  // deployer.deploy(StakingToken, 'Nmx Lp Token', 'NMXLP')
  //   .then(() => deployer.deploy(StakingService, Nmx.address, StakingToken.address, StakingRouter.address));
};
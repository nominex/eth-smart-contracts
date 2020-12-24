const StakingRouter = artifacts.require("StakingRouter");
const Nmx = artifacts.require("Nmx");

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(StakingRouter, Nmx.address);
};

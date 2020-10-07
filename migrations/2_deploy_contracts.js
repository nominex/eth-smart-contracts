const IUniswapV2Router02 = artifacts.require("uniswap/IUniswapV2Router02");
const Nmx = artifacts.require("Nmx");
const NmxLpStaking = artifacts.require("NmxLpStaking");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Nmx);
  const nmx = await Nmx.deployed();
  const uniswapRouterV2 = IUniswapV2Router02.at(network.unswapRouterV2);

  await deployer.deploy(NmxLpStaking, Nmx.address, Nmx.address, accounts[0]);
  const nmxLpStaking = await NmxLpStaking.deployed();
  await nmx.approve(nmxLpStaking.address, 100000);
};

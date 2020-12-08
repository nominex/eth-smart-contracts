const Nmx = artifacts.require("Nmx");

module.exports = async function(deployer) {
  await deployer.deploy(Nmx);
};

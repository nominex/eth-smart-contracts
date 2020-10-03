const ConvertLib = artifacts.require("ConvertLib");
const Nmx = artifacts.require("Nmx");

module.exports = function(deployer) {
  deployer.deploy(ConvertLib);
  deployer.link(ConvertLib, Nmx);
  deployer.deploy(Nmx);
};

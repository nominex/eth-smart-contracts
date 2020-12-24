const Nmx = artifacts.require("Nmx");
const MintSchedule = artifacts.require("MintSchedule");

module.exports = async function (deployer) {
  deployer.deploy(Nmx, MintSchedule.address);
};

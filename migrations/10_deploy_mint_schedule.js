const MintSchedule = artifacts.require("MintSchedule");

module.exports = async function (deployer) {
    deployer.deploy(MintSchedule);
};

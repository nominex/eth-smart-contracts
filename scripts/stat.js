const StakingService = artifacts.require('StakingService');

module.exports = async(callback) => {
    let nmxss = await StakingService.at("0xdbf1b10fe3e05397cd454163f6f1ed0c1181c3b3");
    const userAddress = '0x7f1C2862436A99ddB8bDD96fED99E6D0E9898289';
    let s = await nmxss.state();
    console.log(s)
    let staker = await nmxss.stakers(userAddress);
    console.log(staker.reward.toString())
    callback();
}

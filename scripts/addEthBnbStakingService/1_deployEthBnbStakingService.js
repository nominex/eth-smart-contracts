const StakingService = artifacts.require('StakingService')

async function main() {
    const nmxAddress = '0xd32d01A43c869EdcD1117C640fBDcfCFD97d9d65';
    const lpTokenAddress = '0x13dE257cb86a08753Df938b6ad30d1A456A863e6';
    const routerAddress = '0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994';
    let stakingService = await StakingService.new(nmxAddress, lpTokenAddress, routerAddress);
    console.log('staking service for token', lpTokenAddress, 'deployed at', stakingService.address);
    // staking service for token 0x13dE257cb86a08753Df938b6ad30d1A456A863e6 deployed at 0xab2f4297E7e31638eBE8362471b3038018A106D8
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
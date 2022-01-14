const FarmingHelper = artifacts.require('FarmingHelper')

async function main() {
    const routerAddress = '0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994';
    let farmingHelper = await FarmingHelper.new(routerAddress);
    console.log('farming helper deployed at', farmingHelper.address)
    // farming helper deployed at 0x9AD5a901f3967e049744145E3E9bbf2bEAe34143
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
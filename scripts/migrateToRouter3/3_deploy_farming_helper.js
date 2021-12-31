const FarmingHelper = artifacts.require('FarmingHelper')

async function main() {
    const routerAddress = '0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994';
    let helper = await FarmingHelper.new(routerAddress);
    console.log('helper deployed at', helper.address);

    // helper deployed at 0xF915038A27Eee0e38cF4C978920E945429894EC63
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
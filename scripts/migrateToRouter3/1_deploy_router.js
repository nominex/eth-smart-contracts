const DoubleSupplyStakingRouter = artifacts.require('DoubleSupplyStakingRouter')

async function main() {
    const nmxAddress = '0xd32d01A43c869EdcD1117C640fBDcfCFD97d9d65';
    let router = await DoubleSupplyStakingRouter.new(nmxAddress, {gas: 3000000});
    console.log('router deployed at', router.address);
    console.log('additionalSupplier deployed at', await router.additionalSupplier());
    
    // router deployed at 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994
    // additionalSupplier deployed at 0x955dd09A8955C6b59047938518770f0f9Ed278e0
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
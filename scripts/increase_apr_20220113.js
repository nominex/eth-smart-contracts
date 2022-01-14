const FixedRateNmxSupplier = artifacts.require('FixedRateNmxSupplier')
const FarmingHelper = artifacts.require('FarmingHelper')

async function main() {
    let fixedRateNmxSupplier = await FixedRateNmxSupplier.at('0x955dd09A8955C6b59047938518770f0f9Ed278e0');    
    console.log('current rate', (await fixedRateNmxSupplier.nmxPerSecond()).toString(), 'nmx per second in fixed rate nmx supplier')
    // current rate 521347275416172145n nmx per second in fixed rate nmx supplier
    
    await fixedRateNmxSupplier.updateRate(521347275416172145n + 148956364404620613n/2n);
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
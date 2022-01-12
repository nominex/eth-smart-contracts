const FixedRateNmxSupplier = artifacts.require('FixedRateNmxSupplier')
const FarmingHelper = artifacts.require('FarmingHelper')

async function main() {
    let fixedRateNmxSupplier = await FixedRateNmxSupplier.at('0x955dd09A8955C6b59047938518770f0f9Ed278e0');    
    console.log('current rate', (await fixedRateNmxSupplier.nmxPerSecond()).toString(), 'nmx per second in fixed rate nmx supplier')
    // current rate 446869093213861800 nmx per second in fixed rate nmx supplier
    let farmingHelper = await FarmingHelper.at('0xF915038A27Eee0e38cF4C978920E945429894EC6');
    console.log('current rate', (await farmingHelper.mintScheduleNextTickSupply()).toString(), 'nmx per second in mint schedule')
    // current rate 297912728809241226 nmx per second in mint schedule
    // echo '(297912728809241226*2.5*1.1-297912728809241226)' | bc -l
    // 521347275416172145.50
    await fixedRateNmxSupplier.updateRate(521347275416172145n);
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
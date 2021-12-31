const DoubleSupplyStakingRouter = artifacts.require('DoubleSupplyStakingRouter')
const Nmx = artifacts.require('Nmx')
const StakingService = artifacts.require('StakingService')

async function main() {
    let router = await DoubleSupplyStakingRouter.at('0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994');
    await transferPoolOwnership(router);
    await switchStakingServices(router);

    // primary pool ownership transferred to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994
    // historical reward rate updated for staking service at 0xdbf1b10fe3e05397cd454163f6f1ed0c1181c3b3
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0xdbf1b10fe3e05397cd454163f6f1ed0c1181c3b3
    // historical reward rate updated for staking service at 0x9cd2d1a3214c12bb6dbfa7dbc3b0641c26a2f9a6
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x9cd2d1a3214c12bb6dbfa7dbc3b0641c26a2f9a6
    // historical reward rate updated for staking service at 0x5cd67d65Ff07D5BE2488E51F1a8C69273D258338
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x5cd67d65Ff07D5BE2488E51F1a8C69273D258338
    // historical reward rate updated for staking service at 0x857083580AeD7b5726860937EF030ED8072BC9aB
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x857083580AeD7b5726860937EF030ED8072BC9aB
    // historical reward rate updated for staking service at 0x8326E22a36486ae7D4B85e8DFA732527b962805c
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x8326E22a36486ae7D4B85e8DFA732527b962805c
    // historical reward rate updated for staking service at 0x281e60407b095b956a6A5ac98EE217BEf3144928
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x281e60407b095b956a6A5ac98EE217BEf3144928
    // historical reward rate updated for staking service at 0xd8925c88B94513be760AD88BC10D780d58fA001D
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0xd8925c88B94513be760AD88BC10D780d58fA001D
    // historical reward rate updated for staking service at 0xA937Eddfd12930F758788BcC936B4762BDE9d54C
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0xA937Eddfd12930F758788BcC936B4762BDE9d54C
    // historical reward rate updated for staking service at 0x5c317770bf9A7d7cC88974A97fFA92C209669bFE
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x5c317770bf9A7d7cC88974A97fFA92C209669bFE
    // historical reward rate updated for staking service at 0x26804231a528c894AB6790530b237449a817da6A
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x26804231a528c894AB6790530b237449a817da6A
    // historical reward rate updated for staking service at 0x63A81d936cb14fA3649A4D071608758cFFb3Bd94
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x63A81d936cb14fA3649A4D071608758cFFb3Bd94
    // historical reward rate updated for staking service at 0xA0F2C13e20A11e00acF4e7B47604b24ca8908797

    // run with last 2 pools
    // historical reward rate updated for staking service at 0xA0F2C13e20A11e00acF4e7B47604b24ca8908797
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0xA0F2C13e20A11e00acF4e7B47604b24ca8908797
    // historical reward rate updated for staking service at 0x03868d2e45a9b579Cc68B7addd65Cf78Ddb62a68
    // nmx supplier changed to 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994 for staking service at 0x03868d2e45a9b579Cc68B7addd65Cf78Ddb62a68
    // all 2 staking services switched to nmx supplier at 0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994

}

async function transferPoolOwnership(router) {
    let nmx = await Nmx.at('0xd32d01A43c869EdcD1117C640fBDcfCFD97d9d65')
    await nmx.transferPoolOwnership(1, router.address)
    console.log('primary pool ownership transferred to', router.address)
}

async function switchStakingServices(router) {
    const addresses = [
        '0xdbf1b10fe3e05397cd454163f6f1ed0c1181c3b3',
        '0x9cd2d1a3214c12bb6dbfa7dbc3b0641c26a2f9a6',
        '0x5cd67d65Ff07D5BE2488E51F1a8C69273D258338',
        '0x857083580AeD7b5726860937EF030ED8072BC9aB',
        '0x8326E22a36486ae7D4B85e8DFA732527b962805c',
        '0x281e60407b095b956a6A5ac98EE217BEf3144928',
        '0xd8925c88B94513be760AD88BC10D780d58fA001D',
        '0xA937Eddfd12930F758788BcC936B4762BDE9d54C',
        '0x5c317770bf9A7d7cC88974A97fFA92C209669bFE',
        '0x26804231a528c894AB6790530b237449a817da6A',
        '0x63A81d936cb14fA3649A4D071608758cFFb3Bd94',
        '0xA0F2C13e20A11e00acF4e7B47604b24ca8908797',
        '0x03868d2e45a9b579Cc68B7addd65Cf78Ddb62a68'
    ];
    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        const stakingService = await StakingService.at(address)

        await stakingService.updateHistoricalRewardRate();
        console.log('historical reward rate updated for staking service at', address)

        await stakingService.changeNmxSupplier(router.address)
        console.log('nmx supplier changed to', router.address, 'for staking service at', address)
    }
    console.log('all', addresses.length, 'staking services switched to nmx supplier at', router.address)

}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
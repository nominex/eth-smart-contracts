const DoubleSupplyStakingRouter = artifacts.require('DoubleSupplyStakingRouter')

async function main() {
    let router = await DoubleSupplyStakingRouter.at('0xdD7B0FC7a1A9de6B40220f6443f5D65531cD9994');
    await setShares(router);
}

async function setShares(router) {
    const shares = [
        30.38374672,
        33.42212139,
        10.43175304,
        8.608728238,
        5.165236943,
        2.025583115,
        2.025583115,
        3.038374672,
        3.544770451,
        0.08811286549,
        0.2734537205,
        0.1823024803,
        0.6076749344,
        0.2025583115
    ];

    const addresses = [
        '0xdbf1b10fe3e05397cd454163f6f1ed0c1181c3b3',
        '0x9cd2d1a3214c12bb6dbfa7dbc3b0641c26a2f9a6',
        '0x5cd67d65Ff07D5BE2488E51F1a8C69273D258338',
        '0x857083580AeD7b5726860937EF030ED8072BC9aB',
        '0x8326E22a36486ae7D4B85e8DFA732527b962805c',
        '0x281e60407b095b956a6A5ac98EE217BEf3144928',
        '0xd8925c88B94513be760AD88BC10D780d58fA001D',
        '0xA937Eddfd12930F758788BcC936B4762BDE9d54C',
        '0xab2f4297E7e31638eBE8362471b3038018A106D8',
        '0x5c317770bf9A7d7cC88974A97fFA92C209669bFE',
        '0x26804231a528c894AB6790530b237449a817da6A',
        '0x63A81d936cb14fA3649A4D071608758cFFb3Bd94',
        '0xA0F2C13e20A11e00acF4e7B47604b24ca8908797',
        '0x03868d2e45a9b579Cc68B7addd65Cf78Ddb62a68'
    ];

    const totalShares = shares.reduce((a, b) => a + b)
    const multiplier = 1000000000000;
    const normalizedShares = shares.map(share => share / totalShares);
    console.log('normalized shares', normalizedShares, 'total sum', normalizedShares.reduce((a, b) => a + b))
    const intShares = normalizedShares.map(share => BigInt(Math.floor(share * multiplier)));
    // console.log('int shares', intShares)
    const abdk64x64Shares = intShares.map(share => (share << 64n) / BigInt(multiplier));
    // console.log('abdk64x64 shares', abdk64x64Shares)
    let abdk64x64Rest = (1n << 64n) - abdk64x64Shares.reduce((a, b) => a + b)
    abdk64x64Shares[0] += abdk64x64Rest;
    // console.log(abdk64x64Rest)
    console.log('abdk64x64 shares', abdk64x64Shares)
    abdk64x64Rest = (1n << 64n) - abdk64x64Shares.reduce((a, b) => a + b)
    console.log('shares rest', abdk64x64Rest)

    await router.changeStakingServiceShares(addresses, abdk64x64Shares)
}

module.exports = async (callback) => {
    try {
        await main();
        callback();
    } catch (e) {
        callback(e);
    }
};
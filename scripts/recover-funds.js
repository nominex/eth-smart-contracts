const toBN = web3.utils.toBN;
const fromWei = web3.utils.fromWei;

const ERC20 = artifacts.require("ERC20");
const Nmx = artifacts.require("Nmx");

const destination = "0xb9997B11016235f77Eda5307E6a27872FF961F3A";
const tokens = { "USDT": '0x55d398326f99059ff775485246999027b3197955', "NMX": '0xd32d01a43c869edcd1117c640fbdcfcfd97d9d65' };

module.exports = async (callback) => {
    try {
        const nmx = await Nmx.deployed();
        console.log('Nmx address', nmx.address);
        for (let tokenSymbol in tokens) {
            let tokenAddress = tokens[tokenSymbol];
            let token = await ERC20.at(tokenAddress);
            let tokenBalance = await token.balanceOf(nmx.address, { "gasPrice": toBN("0") });
            let tokenDecimals = await token.decimals({ "gasPrice": toBN("0") });
            console.log("transferring", tokenBalance.div(toBN("10").pow(tokenDecimals)).toString(), tokenSymbol);
            if (!tokenBalance.isZero()) await nmx.recoverFunds(tokenAddress, tokenBalance, destination, { "gasPrice": toBN("5000000000") });
            console.log("transferred");
        }

        callback();
    }
    catch (e) {
        callback(e);
    }
}
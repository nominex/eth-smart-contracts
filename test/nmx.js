const Web3 = require("web3");
const Nmx = artifacts.require("Nmx");

const toBN = Web3.utils.toBN;

contract('Nmx', (accounts) => {
  it('should put 200000000 Nmx in the first account', async () => {
    const nmxInstance = await Nmx.new();
    const balance = await nmxInstance.balanceOf.call(accounts[0]);
    const initBalance = (toBN("200000000")).mul(toBN(1e18));
    assert(balance.eq(initBalance), "200000000 wasn't in the first account");
  });
  it('should send coin correctly', async () => {
    const nmxInstance = await Nmx.new();

    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];

    // Get initial balances of first and second account.
    const accountOneStartingBalance = (await nmxInstance.balanceOf.call(accountOne));
    const accountTwoStartingBalance = (await nmxInstance.balanceOf.call(accountTwo));

    // Make transaction from first account to second.
    const amount = 10;
    await nmxInstance.transfer(accountTwo, amount, { from: accountOne });

    // Get balances of first and second account after the transactions.
    const accountOneEndingBalance = (await nmxInstance.balanceOf.call(accountOne));
    const accountTwoEndingBalance = (await nmxInstance.balanceOf.call(accountTwo));


    assert(accountOneEndingBalance.eq(accountOneStartingBalance.sub(toBN(amount))), "Amount wasn't correctly taken from the sender");
    assert(accountTwoEndingBalance.eq(accountTwoStartingBalance.add(toBN(amount))), "Amount wasn't correctly sent to the receiver");
  });
});

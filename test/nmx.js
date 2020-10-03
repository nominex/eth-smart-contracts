const Nmx = artifacts.require("Nmx");

contract('Nmx', (accounts) => {
  it('should put 200000000 Nmx in the first account', async () => {
    const nmxInstance = await Nmx.deployed();
    const balance = await nmxInstance.balanceOf.call(accounts[0]);

    assert.equal(balance.valueOf(), 200000000, "200000000 wasn't in the first account");
  });
  it('should send coin correctly', async () => {
    const nmxInstance = await Nmx.deployed();

    // Setup 2 accounts.
    const accountOne = accounts[0];
    const accountTwo = accounts[1];

    // Get initial balances of first and second account.
    const accountOneStartingBalance = (await nmxInstance.balanceOf.call(accountOne)).toNumber();
    const accountTwoStartingBalance = (await nmxInstance.balanceOf.call(accountTwo)).toNumber();

    // Make transaction from first account to second.
    const amount = 10;
    await nmxInstance.transfer(accountTwo, amount, { from: accountOne });

    // Get balances of first and second account after the transactions.
    const accountOneEndingBalance = (await nmxInstance.balanceOf.call(accountOne)).toNumber();
    const accountTwoEndingBalance = (await nmxInstance.balanceOf.call(accountTwo)).toNumber();


    assert.equal(accountOneEndingBalance, accountOneStartingBalance - amount, "Amount wasn't correctly taken from the sender");
    assert.equal(accountTwoEndingBalance, accountTwoStartingBalance + amount, "Amount wasn't correctly sent to the receiver");
  });
});

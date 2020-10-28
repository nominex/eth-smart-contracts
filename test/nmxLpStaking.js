const Nmx = artifacts.require("Nmx");
const NmxLpStaking = artifacts.require("NmxLpStaking");

contract('NmxLpStaking', (accounts) => {
  it('should put 200000000 Nmx in the first account', async () => {
    const nmx = await Nmx.deployed();
    /* any erc20 token, for example another erc20 instance*/
    const lpStaking = await NmxLpStaking.deployed();

    const lpInCtrx = await lpStaking.nmxLp.call();

    const lp = await Nmx.at(lpInCtrx);

    assert(lpInCtrx.toLowerCase() === lp.address.toLowerCase(), "lpInCtrx: " + lpInCtrx + " lp.address: " + lp.address);
    await lp.approve(lpStaking.address, 100000000);
    await nmx.approve(lpStaking.address, 100000000);

    const printGas = async amount => {
      const gas = await lpStaking.testGas.estimateGas(amount, {gas: 10000000});
      console.log("Gas for " + amount + " : " + gas);
    };
    await printGas(1);
    await printGas(10);
    await printGas(100);
    await printGas(1000);
    await printGas(10000);

    console.log("finished");
  });
});

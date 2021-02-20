const MockedNmxToken = artifacts.require("MockedNmxToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedPayable = artifacts.require("MockedPayable");
const StakingRouter = artifacts.require("StakingRouter");
const { rpcCommand, ZERO_ADDRESS } = require("../utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract('StakingRouter - recoverable', (accounts) => {

    let nmx;
    let usdtToken;
    let router;
    let payable;
    let snapshotId;

    const now = Math.floor(new Date().getTime() / 1000);

    before(async () => {
        nmx = await MockedNmxToken.new();
        usdtToken = await MockedUsdtToken.new();
        router = await StakingRouter.new(nmx.address);
        payable = await MockedPayable.new(router.address);

        await nmx.setSupply(toWei(toBN(10)));
        await router.changeStakingServiceShares([accounts[2]], [1n << 64n]);
        await router.changeStakingServiceShares([accounts[3]], [1n << 64n]);
        await router.supplyNmx(now);
    });

    beforeEach(async () => {
        // snaphot must be taken before each test because of the issue in ganache
        // evm_revert also deletes the saved snapshot
        // https://github.com/trufflesuite/ganache-cli/issues/138
        snapshotId = await rpcCommand("evm_snapshot");
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('Owner can recover NMX fully', async () => {
        assert.equal(30, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));

        await router.recoverFunds(nmx.address, toWei(toBN(10)), accounts[5]);
        assert.equal(20, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(10, fromWei(await nmx.balanceOf(accounts[5])));
    });

    it('Owner can recover NMX partly', async () => {
        assert.equal(30, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));

        await router.recoverFunds(nmx.address, toWei(toBN(4)), accounts[5]);
        assert.equal(26, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(4, fromWei(await nmx.balanceOf(accounts[5])));
    });

    it('Owner can\'t recover more NMX than available', async () => {
        assert.equal(30, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));

        try {
            await router.recoverFunds(nmx.address, toWei(toBN(11)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(30, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));
    });

    it('Not owner can\'t recover NMX', async () => {
        assert.equal(30, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));

        try {
            await router.recoverFunds(nmx.address, toWei(toBN(9)), accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(30, fromWei(await nmx.balanceOf(router.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));
    });

    it('Owner can recover ERC20 fully', async () => {
        await usdtToken.transfer(router.address, 10);
        assert.equal(10, await usdtToken.balanceOf(router.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await router.recoverFunds(usdtToken.address, 10, accounts[5]);
        assert.equal(0, await usdtToken.balanceOf(router.address));
        assert.equal(10, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ERC20 partly', async () => {
        await usdtToken.transfer(router.address, 10);
        assert.equal(10, await usdtToken.balanceOf(router.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await router.recoverFunds(usdtToken.address, 8, accounts[5]);
        assert.equal(2, await usdtToken.balanceOf(router.address));
        assert.equal(8, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can\'t recover more ERC20 than available', async () => {
        await usdtToken.transfer(router.address, 10);
        assert.equal(10, await usdtToken.balanceOf(router.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await router.recoverFunds(usdtToken.address, 11, accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(router.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Not owner can\'t recover ERC20', async () => {
        await usdtToken.transfer(router.address, 10);
        assert.equal(10, await usdtToken.balanceOf(router.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await router.recoverFunds(usdtToken.address, 9, accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(router.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ETH fully', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await router.recoverFunds(ZERO_ADDRESS, toWei(toBN(10)), accounts[5]);
        assert.equal(0, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(110, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can recover ETH partly', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await router.recoverFunds(ZERO_ADDRESS, toWei(toBN(4)), accounts[5]);
        assert.equal(6, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(104, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can\'t recover more ETH than available', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await router.recoverFunds(ZERO_ADDRESS, toWei(toBN(11)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Not owner can\'t recover ETH', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await router.recoverFunds(ZERO_ADDRESS, toWei(toBN(9)), accounts[5], {from:accounts[4]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(router.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

});
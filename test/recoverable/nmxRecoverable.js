const Nmx = artifacts.require("Nmx");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedPayable = artifacts.require("MockedPayable");
const { rpcCommand, ZERO_ADDRESS } = require("../utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract('Nmx - recoverable', (accounts) => {

    let nmx;
    let usdtToken;
    let payable;
    let snapshotId;

    before(async () => {
        nmx = await Nmx.deployed();
        usdtToken = await MockedUsdtToken.new();
        payable = await MockedPayable.new(nmx.address);
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
        await nmx.transfer(nmx.address, 10);
        assert.equal(10, await nmx.balanceOf(nmx.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        await nmx.recoverFunds(nmx.address, 10, accounts[5]);
        assert.equal(0, await nmx.balanceOf(nmx.address));
        assert.equal(10, await nmx.balanceOf(accounts[5]));
    });

    it('Owner can recover NMX partly', async () => {
        await nmx.transfer(nmx.address, 10);
        assert.equal(10, await nmx.balanceOf(nmx.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        await nmx.recoverFunds(nmx.address, 7, accounts[5]);
        assert.equal(3, await nmx.balanceOf(nmx.address));
        assert.equal(7, await nmx.balanceOf(accounts[5]));
    });

    it('Owner can\'t recover more NMX than available', async () => {
        await nmx.transfer(nmx.address, 10);
        assert.equal(10, await nmx.balanceOf(nmx.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        try {
            await nmx.recoverFunds(nmx.address, 11, accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await nmx.balanceOf(nmx.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));
    });

    it('Not owner can\'t recover NMX', async () => {
        await nmx.transfer(nmx.address, 10);
        assert.equal(10, await nmx.balanceOf(nmx.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        try {
            await nmx.recoverFunds(nmx.address, 9, accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await nmx.balanceOf(nmx.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));
    });

    it('Owner can recover ERC20 fully', async () => {
        await usdtToken.transfer(nmx.address, 10);
        assert.equal(10, await usdtToken.balanceOf(nmx.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await nmx.recoverFunds(usdtToken.address, 10, accounts[5]);
        assert.equal(0, await usdtToken.balanceOf(nmx.address));
        assert.equal(10, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ERC20 partly', async () => {
        await usdtToken.transfer(nmx.address, 10);
        assert.equal(10, await usdtToken.balanceOf(nmx.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await nmx.recoverFunds(usdtToken.address, 8, accounts[5]);
        assert.equal(2, await usdtToken.balanceOf(nmx.address));
        assert.equal(8, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can\'t recover more ERC20 than available', async () => {
        await usdtToken.transfer(nmx.address, 10);
        assert.equal(10, await usdtToken.balanceOf(nmx.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await nmx.recoverFunds(usdtToken.address, 11, accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(nmx.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Not owner can\'t recover ERC20', async () => {
        await usdtToken.transfer(nmx.address, 10);
        assert.equal(10, await usdtToken.balanceOf(nmx.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await nmx.recoverFunds(usdtToken.address, 9, accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(nmx.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });
    
    it('Owner can recover ETH fully', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await nmx.recoverFunds(ZERO_ADDRESS, toWei(toBN(10)), accounts[5]);
        assert.equal(0, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(110, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can recover ETH partly', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await nmx.recoverFunds(ZERO_ADDRESS, toWei(toBN(4)), accounts[5]);
        assert.equal(6, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(104, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can\'t recover more ETH than available', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await nmx.recoverFunds(ZERO_ADDRESS, toWei(toBN(11)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Not owner can\'t recover ETH', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await nmx.recoverFunds(ZERO_ADDRESS, toWei(toBN(9)), accounts[5], {from:accounts[4]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(nmx.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

});

const Nmx = artifacts.require("Nmx");
const MintSchedule = artifacts.require("MintSchedule");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedPayable = artifacts.require("MockedPayable");
const { rpcCommand, ZERO_ADDRESS } = require("../utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract('MintSchedule - recoverable', (accounts) => {

    let nmx;
    let mintSchedule;
    let usdtToken;
    let payable;
    let snapshotId;

    before(async () => {
        nmx = await Nmx.deployed();
        mintSchedule = await MintSchedule.new();
        usdtToken = await MockedUsdtToken.new();
        payable = await MockedPayable.new(mintSchedule.address);
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
        await nmx.transfer(mintSchedule.address, 10);
        assert.equal(10, await nmx.balanceOf(mintSchedule.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        await mintSchedule.recoverFunds(nmx.address, 10, accounts[5]);
        assert.equal(0, await nmx.balanceOf(mintSchedule.address));
        assert.equal(10, await nmx.balanceOf(accounts[5]));
    });

    it('Owner can recover NMX partly', async () => {
        await nmx.transfer(mintSchedule.address, 10);
        assert.equal(10, await nmx.balanceOf(mintSchedule.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        await mintSchedule.recoverFunds(nmx.address, 7, accounts[5]);
        assert.equal(3, await nmx.balanceOf(mintSchedule.address));
        assert.equal(7, await nmx.balanceOf(accounts[5]));
    });

    it('Owner can\'t recover more NMX than available', async () => {
        await nmx.transfer(mintSchedule.address, 10);
        assert.equal(10, await nmx.balanceOf(mintSchedule.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        try {
            await mintSchedule.recoverFunds(nmx.address, 11, accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await nmx.balanceOf(mintSchedule.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));
    });

    it('Not owner can\'t recover NMX', async () => {
        await nmx.transfer(mintSchedule.address, 10);
        assert.equal(10, await nmx.balanceOf(mintSchedule.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));

        try {
            await mintSchedule.recoverFunds(nmx.address, 9, accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await nmx.balanceOf(mintSchedule.address));
        assert.equal(0, await nmx.balanceOf(accounts[5]));
    });

    it('Owner can recover ERC20 fully', async () => {
        await usdtToken.transfer(mintSchedule.address, 10);
        assert.equal(10, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await mintSchedule.recoverFunds(usdtToken.address, 10, accounts[5]);
        assert.equal(0, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(10, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ERC20 partly', async () => {
        await usdtToken.transfer(mintSchedule.address, 10);
        assert.equal(10, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await mintSchedule.recoverFunds(usdtToken.address, 8, accounts[5]);
        assert.equal(2, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(8, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can\'t recover more ERC20 than available', async () => {
        await usdtToken.transfer(mintSchedule.address, 10);
        assert.equal(10, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await mintSchedule.recoverFunds(usdtToken.address, 11, accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Not owner can\'t recover ERC20', async () => {
        await usdtToken.transfer(mintSchedule.address, 10);
        assert.equal(10, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await mintSchedule.recoverFunds(usdtToken.address, 9, accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(mintSchedule.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ETH fully', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await mintSchedule.recoverFunds(ZERO_ADDRESS, toWei(toBN(10)), accounts[5]);
        assert.equal(0, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(110, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can recover ETH partly', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await mintSchedule.recoverFunds(ZERO_ADDRESS, toWei(toBN(4)), accounts[5]);
        assert.equal(6, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(104, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can\'t recover more ETH than available', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await mintSchedule.recoverFunds(ZERO_ADDRESS, toWei(toBN(11)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Not owner can\'t recover ETH', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await mintSchedule.recoverFunds(ZERO_ADDRESS, toWei(toBN(9)), accounts[5], {from:accounts[4]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(mintSchedule.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

});

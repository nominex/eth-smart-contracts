const MockedNmxToken = artifacts.require("MockedNmxToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedPayable = artifacts.require("MockedPayable");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService2 = artifacts.require("StakingService2");
const { rpcCommand, ZERO_ADDRESS } = require("../utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract('StakingService2 - recoverable', (accounts) => {

    let nmx;
    let usdtToken;
    let stakingToken;
    let stakingService;
    let router;
    let payable;
    let snapshotId;

    before(async () => {
        nmx = await MockedNmxToken.new();
        usdtToken = await MockedUsdtToken.new();
        stakingToken = await MockedStakingToken.new(usdtToken.address);
        router = await StakingRouter.new(nmx.address);
        stakingService = await StakingService2.new(
            nmx.address,
            stakingToken.address,
            router.address
        );
        payable = await MockedPayable.new(stakingService.address);

        await nmx.setSupply(toWei(toBN(10)));
        await router.changeStakingServiceShares([stakingService.address], [1n << 64n]);
        await stakingToken.transfer(accounts[1], toWei(toBN(1000)));
        await stakingToken.approve(stakingService.address, toWei(toBN(1000)), {
            from: accounts[1],
        });
        await stakingToken.transfer(accounts[3], toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: accounts[3]});
        await stakingService.stakeFrom(accounts[1], toWei(toBN(4)));
        await stakingService.stakeFrom(accounts[3], toWei(toBN(6)));
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

    it('Owner can\'t recover NMX', async () => {
        assert.equal(10, fromWei(await nmx.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));

        try {
            await stakingService.recoverFunds(nmx.address, toWei(toBN(10)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("NmxStakingService: INVALID_RECOVERABLE_TOKEN"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await nmx.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await nmx.balanceOf(accounts[5])));
    });

    it('Owner can recover stakingToken fully', async () => {
        await stakingToken.transfer(stakingService.address, toWei(toBN(10)));
        assert.equal(20, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await stakingToken.balanceOf(accounts[5])));

        await stakingService.recoverFunds(stakingToken.address, toWei(toBN(10)), accounts[5]);
        assert.equal(10, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(10, fromWei(await stakingToken.balanceOf(accounts[5])));
    });

    it('Owner can recover stakingToken partly', async () => {
        await stakingToken.transfer(stakingService.address, toWei(toBN(10)));
        assert.equal(20, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await stakingToken.balanceOf(accounts[5])));

        await stakingService.recoverFunds(stakingToken.address, toWei(toBN(3)), accounts[5]);
        assert.equal(17, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(3, fromWei(await stakingToken.balanceOf(accounts[5])));
    });

    it('Owner can\'t recover more stakingToken than available', async () => {
        await stakingToken.transfer(stakingService.address, toWei(toBN(10)));
        assert.equal(20, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await stakingToken.balanceOf(accounts[5])));
        try {
            await stakingService.recoverFunds(stakingToken.address, toWei(toBN(11)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(20, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await stakingToken.balanceOf(accounts[5])));
    });

    it('Not owner can\'t recover stakingToken', async () => {
        await stakingToken.transfer(stakingService.address, toWei(toBN(10)));
        assert.equal(20, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await stakingToken.balanceOf(accounts[5])));
        try {
            await stakingService.recoverFunds(stakingToken.address, toWei(toBN(9)), accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(20, fromWei(await stakingToken.balanceOf(stakingService.address)));
        assert.equal(0, fromWei(await stakingToken.balanceOf(accounts[5])));
    });

    it('Owner can recover ERC20 fully', async () => {
        await usdtToken.transfer(stakingService.address, 10);
        assert.equal(10, await usdtToken.balanceOf(stakingService.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await stakingService.recoverFunds(usdtToken.address, 10, accounts[5]);
        assert.equal(0, await usdtToken.balanceOf(stakingService.address));
        assert.equal(10, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ERC20 partly', async () => {
        await usdtToken.transfer(stakingService.address, 10);
        assert.equal(10, await usdtToken.balanceOf(stakingService.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        await stakingService.recoverFunds(usdtToken.address, 8, accounts[5]);
        assert.equal(2, await usdtToken.balanceOf(stakingService.address));
        assert.equal(8, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can\'t recover more ERC20 than available', async () => {
        await usdtToken.transfer(stakingService.address, 10);
        assert.equal(10, await usdtToken.balanceOf(stakingService.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await stakingService.recoverFunds(usdtToken.address, 11, accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(stakingService.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Not owner can\'t recover ERC20', async () => {
        await usdtToken.transfer(stakingService.address, 10);
        assert.equal(10, await usdtToken.balanceOf(stakingService.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));

        try {
            await stakingService.recoverFunds(usdtToken.address, 9, accounts[5], {from:accounts[5]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, await usdtToken.balanceOf(stakingService.address));
        assert.equal(0, await usdtToken.balanceOf(accounts[5]));
    });

    it('Owner can recover ETH fully', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await stakingService.recoverFunds(ZERO_ADDRESS, toWei(toBN(10)), accounts[5]);
        assert.equal(0, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(110, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can recover ETH partly', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        await stakingService.recoverFunds(ZERO_ADDRESS, toWei(toBN(4)), accounts[5]);
        assert.equal(6, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(104, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Owner can\'t recover more ETH than available', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await stakingService.recoverFunds(ZERO_ADDRESS, toWei(toBN(11)), accounts[5]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("RecoverableByOwner: RECOVERABLE_AMOUNT_NOT_ENOUGH"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

    it('Not owner can\'t recover ETH', async () => {
        await web3.eth.sendTransaction({from: accounts[0], to:payable.address, value: toWei(toBN(10))})
        await payable.close();
        assert.equal(10, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));

        try {
            await stakingService.recoverFunds(ZERO_ADDRESS, toWei(toBN(9)), accounts[5], {from:accounts[4]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(
                e.message.includes("Ownable: caller is not the owner"),
                `Unexpected error message: ${e.message}`
            );
        }
        assert.equal(10, fromWei(await web3.eth.getBalance(stakingService.address)));
        assert.equal(100, fromWei(await web3.eth.getBalance(accounts[5])));
    });

});
const StakingRouter = artifacts.require("StakingRouter");
const NmxStub = artifacts.require("NmxStub");
const { ZERO_ADDRESS } = require('../lib/utils.js');

contract('StakingRouter - changeStakingServiceShares - validation', (accounts) => {

    let router;

    before(async () => { router = await StakingRouter.deployed(); });

    it("owner can change service shares", async () => {
        const owner = await router.owner();
        assert(owner === accounts[0], 'Owner is not accounts[0]');
        await router.changeStakingServiceShares([], [], { from: accounts[0] });
    });

    it("not owner can not change service shares", async () => {
        const owner = await router.owner();
        assert(owner == accounts[0], 'Owner is not accounts[0]');
        assert(accounts[0] !== accounts[1], 'Same addresses in accounts at indexes 0 and 1');
        try {
            await router.changeStakingServiceShares([], [], { from: accounts[1] });
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("Ownable: caller is not the owner"), `Unexpected error message: ${e.message}`);
        }
    });

    it("empty addresses array is correct", async () => {
        await router.changeStakingServiceShares([], []);
    });

    it("shares must be same length as addresses", async () => {
        try {
            await router.changeStakingServiceShares([], [0]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKROU: addresses must be the same length as shares"), `Unexpected error message: ${e.message}`);
        }
    });

    it("shares can not be negative", async () => {
        try {
            await router.changeStakingServiceShares([ZERO_ADDRESS], [-1n << 64n]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKROU: shares must be positive"), `Unexpected error message: ${e.message}`);
        }
    });

    it("shares can not be zero", async () => {
        try {
            await router.changeStakingServiceShares([ZERO_ADDRESS], [0n]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKROU: shares must be positive"), `Unexpected error message: ${e.message}`);
        }
    });

    it("shares must le 1", async () => {
        try {
            await router.changeStakingServiceShares([ZERO_ADDRESS], [(1n << 64n) + 1n]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKROU: shares must be le 1<<64"), `Unexpected error message: ${e.message}`);
        }
    });

    it("1 is correct share", async () => {
        await router.changeStakingServiceShares([ZERO_ADDRESS], [1n << 64n]);
    });

    it("1 is correct total share", async () => {
        await router.changeStakingServiceShares([accounts[0], accounts[1]], [(1n << 64n) - 1n, 1]);
    });

    it("total share must be le 1", async () => {
        try {
            await router.changeStakingServiceShares([accounts[0], accounts[1]], [(1n << 64n) - 1n, 2]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKROU: shares must be le 1<<64 in total"), `Unexpected error message: ${e.message}`);
        }
    });

});

contract('StakingRouter - changeStakingServiceShares - persistence', (accounts) => {

    let router;

    before(async () => { router = await StakingRouter.deployed(); });

    it("new values saved", async () => {
        const previousValue = parseInt(await router.serviceShares(accounts[0]));
        assert(previousValue === 0, `Unexpected previous share ${previousValue}`);
        await router.changeStakingServiceShares([accounts[0]], [1]);
        const newValue = parseInt(await router.serviceShares(accounts[0]));
        assert(newValue === 1, `Unexpected new share ${newValue}`);
    });

    it("old shares reseted", async () => {
        await router.changeStakingServiceShares([accounts[0]], [1]);
        await router.changeStakingServiceShares([accounts[1]], [1]);
        const address0Share = parseInt(await router.serviceShares(accounts[0]));
        assert(address0Share === 0, `Unexpected new share ${address0Share}`);
    });

});

contract('StakingRouter - changeStakingServiceShares - stubbed', (accounts) => {

    let nmxStub;
    let router;

    before(async () => {
        nmxStub = await NmxStub.new();
        router = await StakingRouter.new(nmxStub.address);
        await router.changeStakingServiceShares([accounts[0]], [1n << 64n]);
    });

    it("pending supplies not changed on shares changed", async () => {
        assert((await router.pendingSupplies(accounts[0])).toNumber() === 0);

        await router.supplyNmx({ from: accounts[1] });
        const initialPendingSupply = (await router.pendingSupplies(accounts[0]));
        assert(!initialPendingSupply.eq(web3.utils.toBN(0)), `Unexpected pending supply ${initialPendingSupply}`);
        await router.changeStakingServiceShares([], []);
        const finalPendingSupply = (await router.pendingSupplies(accounts[0]));
        assert(initialPendingSupply.eq(finalPendingSupply), `Pending supply was changed ${initialPendingSupply} ${finalPendingSupply}`);
    });

});

contract('StakingRouter - supplyNmx', (accounts) => {

    let nmxStub;
    let router;

    beforeEach(async () => {
        nmxStub = await NmxStub.new();
        router = await StakingRouter.new(nmxStub.address);
    });

    it('pending supply of all active services updates', async () => {
        await router.changeStakingServiceShares([accounts[0], accounts[1]], [1n << 63n, 1n << 63n]);
        const initialPendingSupply = (await router.pendingSupplies(accounts[0]));

        await router.supplyNmx({ from: accounts[1] });
        const finalPendingSupply = (await router.pendingSupplies(accounts[0]));
        assert(initialPendingSupply.lt(finalPendingSupply), `Pending supply was not increased ${initialPendingSupply} ${finalPendingSupply}`);
    });

    it('service actually got supply', async () => {
        await router.changeStakingServiceShares([accounts[0]], [1n << 64n]);
        const initialSupply = (await nmxStub.balanceOf(accounts[0]));

        await router.supplyNmx();
        const finalSupply = (await nmxStub.balanceOf(accounts[0]));
        assert(initialSupply.lt(finalSupply), `Supply was not transferred to service account ${initialSupply} ${finalSupply}`);
    });

    it('transferred amount eq function result', async () => {
        await router.changeStakingServiceShares([accounts[0]], [1n << 64n]);
        const initialSupply = (await nmxStub.balanceOf(accounts[0]));

        const supply = await router.supplyNmx.call(); // call to estimate supply
        await router.supplyNmx(); // actual transaction to transfer supply
        const finalSupply = (await nmxStub.balanceOf(accounts[0]));
        assert(finalSupply.sub(initialSupply).eq(supply), `supplyNmx returned different to actually transferred amount ${supply} ${initialSupply} ${finalSupply}`);
    });

});

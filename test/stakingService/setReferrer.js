const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const SetReferrerProxy = artifacts.require("SetReferrerProxy");
const StakingService = artifacts.require("StakingService");
const {rpcCommand, ZERO_ADDRESS} = require("../utils.js");
const truffleAssert = require('truffle-assertions');

contract('StakingService#setReferrer', (accounts) => {

    let stakingService;
    let setReferrerProxy;
    let snapshotId;

    const userWithoutReferrer = accounts[1];
    const userWithReferrer = accounts[2];

    before(async () => {
        let nmx = await MockedNmxToken.new();
        let stakingToken = await MockedStakingToken.new();
        stakingService = await StakingService.new(nmx.address, stakingToken.address, nmx.address);
        setReferrerProxy = await SetReferrerProxy.new(stakingService.address);

        await stakingService.setReferrer(accounts[4], {from: userWithReferrer});
    });

    beforeEach(async () => {
        // snaphot must be taken before each test because of the issue in ganache
        // evm_revert also deletes the saved snapshot
        // https://github.com/trufflesuite/ganache-cli/issues/138
        snapshotId = await rpcCommand("evm_snapshot");
        await assertReferrer(userWithoutReferrer, ZERO_ADDRESS);
        await assertReferrer(userWithReferrer, accounts[4]);
    });

    afterEach(async () => {
        await assertReferrer(userWithReferrer, accounts[4]);
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('can not set zero address as a referrer', async () => {
        try {
            await stakingService.setReferrer(ZERO_ADDRESS, {from: userWithoutReferrer});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_REFERRER"), `Unexpected error message: ${e.message}`);
        }
    });

    it('can not set the same referrer twice', async () => {
        try {
            await stakingService.setReferrer(accounts[4], {from: userWithReferrer});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_REFERRER"), `Unexpected error message: ${e.message}`);
        }
    });

    it('can not change a referrer', async () => {
        try {
            await stakingService.setReferrer(accounts[5], {from: userWithReferrer});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_REFERRER"), `Unexpected error message: ${e.message}`);
        }
    });


    it('can not set yourself as a referrer', async () => {
        try {
            await stakingService.setReferrer(userWithoutReferrer, {from: userWithoutReferrer});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_REFERRER"), `Unexpected error message: ${e.message}`);
        }
    });

    it('can set referrer of a user without a referrer', async () => {
        await test(userWithoutReferrer, accounts[5]);
    });

    it('one referrer can have several referrals', async () => {
        await test(userWithoutReferrer, accounts[4]);
    });

    it('can set referrer of a user with a referrer', async () => {
        await test(userWithoutReferrer, userWithReferrer);
    });

    it('can set your referral as a referrer', async () => {
        await test(accounts[4], userWithReferrer);
    });

    it('can set a referral through another contract', async () => {
        let setReferrerProxyTx = await setReferrerProxy.setReferrer(accounts[5], {from: userWithoutReferrer});
        let stakingServiceTx = await truffleAssert.createTransactionResult(stakingService, setReferrerProxyTx.tx);
        truffleAssert.eventEmitted(stakingServiceTx, 'ReferrerChanged', (ev) => {
            return ev.referral === userWithoutReferrer && ev.referrer === accounts[5];
        });
        await assertReferrer(userWithoutReferrer, accounts[5]);
    });

    async function test(referral, referrer) {
        let tx = await stakingService.setReferrer(referrer, {from: referral});
        truffleAssert.eventEmitted(tx, 'ReferrerChanged', {referral: referral, referrer: referrer});
        await assertReferrer(referral, referrer);
    }

    async function assertReferrer(referral, expectedReferrer) {
        let actualReferrer = await stakingService.referrers(referral);
        assert.equal(actualReferrer, expectedReferrer, "referrer");
    }

});

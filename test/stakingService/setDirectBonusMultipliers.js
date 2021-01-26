const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const StakingService = artifacts.require("StakingService");
const {rpcCommand} = require("../utils.js");

contract('StakingService#setDirectBonusMultipliers', (accounts) => {

    let stakingService;
    let snapshotId;

    before(async () => {
        let nmx = await MockedNmxToken.new();
        let stakingToken = await MockedStakingToken.new();
        stakingService = await StakingService.new(nmx.address, stakingToken.address, nmx.address);
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

    it('values stored', async () => {
        await setDirectBonusMultipliersAndVerify([
            {stakedAmountInUsdt: 1, referrer: 2, referral: 3},
            {stakedAmountInUsdt: 4, referrer: 5, referral: 6},
            {stakedAmountInUsdt: 7, referrer: 8, referral: 9}
        ]);
    });

    it('cleared values', async () => {
        await stakingService.setDirectBonusMultipliers([
            {stakedAmountInUsdt: 1, referrer: 2, referral: 3},
            {stakedAmountInUsdt: 4, referrer: 5, referral: 6},
            {stakedAmountInUsdt: 7, referrer: 8, referral: 9}
        ]);
        await setDirectBonusMultipliersAndVerify([]);
    });

    it('length decreased', async () => {
        await stakingService.setDirectBonusMultipliers([
            {stakedAmountInUsdt: 1, referrer: 2, referral: 3},
            {stakedAmountInUsdt: 4, referrer: 5, referral: 6},
            {stakedAmountInUsdt: 7, referrer: 8, referral: 9}
        ]);
        await setDirectBonusMultipliersAndVerify([{stakedAmountInUsdt: 55, referrer: 66, referral: 77}]);
    });

    it('length increased', async () => {
        await stakingService.setDirectBonusMultipliers([{stakedAmountInUsdt: 55, referrer: 66, referral: 77}]);
        await setDirectBonusMultipliersAndVerify([
            {stakedAmountInUsdt: 1, referrer: 2, referral: 3},
            {stakedAmountInUsdt: 4, referrer: 5, referral: 6},
            {stakedAmountInUsdt: 7, referrer: 8, referral: 9}
        ]);
    });

    it('available when StakingService paused', async () => {
        await stakingService.pause();
        await stakingService.setDirectBonusMultipliers([
            {stakedAmountInUsdt: 1, referrer: 2, referral: 3},
            {stakedAmountInUsdt: 4, referrer: 5, referral: 6},
            {stakedAmountInUsdt: 7, referrer: 8, referral: 9}
        ]);
    });

    it('available for owner', async () => {
        await stakingService.setDirectBonusMultipliers([], {from: accounts[0]});
    });

    it('not available for not owner', async () => {
        try {
            await stakingService.setDirectBonusMultipliers([], {from: accounts[1]});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("Ownable: caller is not the owner"), `Unexpected error message: ${e.message}`);
        }
    });

    it('first element can start at zero stakedAmountInUsdt', async () => {
        await setDirectBonusMultipliersAndVerify([
            {stakedAmountInUsdt: 0, referrer: 1, referral: 2},
            {stakedAmountInUsdt: 10, referrer: 100, referral: 1000}
        ]);
    });

    it('first element can start at greater than zero stakedAmountInUsdt', async () => {
        await stakingService.setDirectBonusMultipliers([
            {stakedAmountInUsdt: 5, referrer: 1, referral: 2},
            {stakedAmountInUsdt: 10, referrer: 100, referral: 1000}
        ]);
    });

    it('the same stakedAmountInUsdt two times in a row', async () => {
        try {
            await stakingService.setDirectBonusMultipliers([
                {stakedAmountInUsdt: 5, referrer: 1, referral: 2},
                {stakedAmountInUsdt: 5, referrer: 100, referral: 1000}
            ]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_ORDER"), `Unexpected error message: ${e.message}`);
        }
    });

    it('stakedAmountInUsdt is less than the previous value', async () => {
        try {
            await stakingService.setDirectBonusMultipliers([
                {stakedAmountInUsdt: 5, referrer: 10, referral: 11},
                {stakedAmountInUsdt: 7, referrer: 12, referral: 13},
                {stakedAmountInUsdt: 6, referrer: 14, referral: 15},
                {stakedAmountInUsdt: 8, referrer: 16, referral: 17},
            ]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_ORDER"), `Unexpected error message: ${e.message}`);
        }
    });

    async function setDirectBonusMultipliersAndVerify(newMultipliersArray) {
        await stakingService.setDirectBonusMultipliers(newMultipliersArray);

        for (let i = 0; i < newMultipliersArray.length; i++) {
            let expected = newMultipliersArray[i];
            let actual = await stakingService.directBonusMultipliers(i);
            assert.equal(actual.stakedAmountInUsdt.toString(), expected.stakedAmountInUsdt.toString(), `${i} item stakedAmountInUsdt`);
            assert.equal(actual.referrer.toString(), expected.referrer.toString(), `${i} item referrer`);
            assert.equal(actual.referral.toString(), expected.referral.toString(), `${i} item referral`);
        }

        let error = null;
        try {
            await stakingService.directBonusMultipliers(newMultipliersArray.length);
        } catch (e) {
            error = e;
        }
        assert.isNotNull(error, "directBonusMultipliers length is longer than expected");
    }

});

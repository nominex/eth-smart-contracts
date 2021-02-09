const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const StakingService = artifacts.require("StakingService");
const {rpcCommand, ZERO_ADDRESS, getAssertBN, getComparesEqualBN} = require("../utils.js");
const truffleAssert = require('truffle-assertions');

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;

contract('StakingService#bonusAmounts', (accounts) => {

    const assertBN = getAssertBN(toWei(toBN(100), "wei"));
    const comparesEqualBN = getComparesEqualBN(toWei(toBN(100), "wei"));

    let nmx;
    let stakingService;
    let snapshotId;

    const userWithoutReferrer = accounts[1];
    const userWithReferrer = accounts[2];

    before(async () => {
        nmx = await MockedNmxToken.new();
        let usdtToken = await MockedUsdtToken.new();
        let stakingToken = await MockedStakingToken.new(usdtToken.address);
        stakingService = await StakingService.new(nmx.address, stakingToken.address, nmx.address);

        // mock lp token price = 2$
        await usdtToken.transfer(stakingToken.address, toBN(20000).mul(toBN(10).pow(await usdtToken.decimals())));

        await stakingToken.transfer(userWithoutReferrer, toWei(toBN(500)));

        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: userWithoutReferrer});

        await stakingToken.transfer(userWithReferrer, toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: userWithReferrer});

        await stakingToken.transfer(accounts[3], toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: accounts[3]});
        await stakingService.stakeFrom(accounts[3], toWei(toBN(10))); // staked 40$
        await stakingService.setReferrer(accounts[3], {from: userWithReferrer});

        await stakingService.setReferralMultiplier(0);
        await stakingService.setReferrerMultipliers([]);
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

    it('no bonuses without stakes for a user without a referrer', async () => {
        await stakingService.setReferralMultiplier(5000);
        await stakingService.setReferrerMultipliers([{stakedAmountInUsdt: 0, multiplier: 1000}]);
        await updateStakerAndVerify(userWithoutReferrer, 0, 0, 0);
    });

    it('no bonuses without stakes for a user with a referrer', async () => {
        await stakingService.setReferralMultiplier(5000);
        await stakingService.setReferrerMultipliers([{stakedAmountInUsdt: 0, multiplier: 1000}]);
        await updateStakerAndVerify(userWithReferrer, 0, 0, 0);
    });

    it('only staking bonus for a user without a referrer', async () => {
        await stakingService.stakeFrom(userWithoutReferrer, toWei(toBN(6)));
        await updateStakerAndVerify(userWithoutReferrer, (1 / (10 + 6)) * 6, 0, 0);
    });

    it('bonuses for a user with a referrer with zero multipliers', async () => {
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        await updateStakerAndVerify(userWithReferrer, (1 / (10 + 6)) * 6, 0, 0);
    });

    it('bonuses for a user with a referrer with only referral multiplier', async () => {
        await stakingService.setReferralMultiplier(500);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, expectedStakingBonus * 0.05, 0);
    });

    it('bonuses for a user with a referrer with only referrer multiplier', async () => {
        await stakingService.setReferrerMultipliers([{stakedAmountInUsdt: 0, multiplier: 2000}]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.2);
    });

    it('bonuses for a user with a referrer with all multipliers', async () => {
        await stakingService.setReferralMultiplier(6000);
        await stakingService.setReferrerMultipliers([{stakedAmountInUsdt: 0, multiplier: 3000}]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, expectedStakingBonus * 0.6, expectedStakingBonus * 0.3);
    });

    it('check order of referrer bonus multiplier before first element', async () => {
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 50, multiplier: 7000},
            {stakedAmountInUsdt: 60, multiplier: 8000},
            {stakedAmountInUsdt: 70, multiplier: 9000}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, 0);
    });

    it('check order of referrer bonus multiplier with first element', async () => {
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 30, multiplier: 1000},
            {stakedAmountInUsdt: 50, multiplier: 2000},
            {stakedAmountInUsdt: 70, multiplier: 3500}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.1);
    });

    it('check order of referrer bonus multiplier with element in the middle', async () => {
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 20, multiplier: 1000},
            {stakedAmountInUsdt: 30, multiplier: 2000},
            {stakedAmountInUsdt: 40, multiplier: 3500},
            {stakedAmountInUsdt: 50, multiplier: 4000},
            {stakedAmountInUsdt: 60, multiplier: 5000}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.35);
    });

    it('check order of referrer bonus multiplier with last element', async () => {
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 10, multiplier: 3500},
            {stakedAmountInUsdt: 20, multiplier: 4700},
            {stakedAmountInUsdt: 30, multiplier: 5400}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.54);
    });

    it('check order of referrer bonus multiplier with no referrer staked amount', async () => {
        await stakingService.setReferrer(accounts[5], {from: userWithoutReferrer});
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 0, multiplier: 50},
            {stakedAmountInUsdt: 1, multiplier: 600},
            {stakedAmountInUsdt: 2, multiplier: 7000}
        ]);
        await stakingService.stakeFrom(userWithoutReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await updateStakerAndVerify(userWithoutReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.005);
    });

    it('check the lack of funds for the payment of bonuses: partial payment to the referral', async () => {
        await stakingService.setReferralMultiplier(5000);
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 33, multiplier: 2500},
            {stakedAmountInUsdt: 44, multiplier: 600},
            {stakedAmountInUsdt: 55, multiplier: 7000}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await nmx.setMaxDirectBonus(toBN((expectedStakingBonus * 0.35 + expectedStakingBonus * 0.25) * 10 ** 18));
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, expectedStakingBonus * 0.35, expectedStakingBonus * 0.25);
    });

    it('check the lack of funds for the payment of bonuses: no payment to the referral', async () => {
        await stakingService.setReferralMultiplier(5000);
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 33, multiplier: 2500},
            {stakedAmountInUsdt: 44, multiplier: 600},
            {stakedAmountInUsdt: 55, multiplier: 7000}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await nmx.setMaxDirectBonus(toBN((expectedStakingBonus * 0.25) * 10 ** 18));
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.25);
    });

    it('check the lack of funds for the payment of bonuses: partial payment to the referrer', async () => {
        await stakingService.setReferralMultiplier(5000);
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 33, multiplier: 2500},
            {stakedAmountInUsdt: 44, multiplier: 600},
            {stakedAmountInUsdt: 55, multiplier: 7000}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await nmx.setMaxDirectBonus(toBN((expectedStakingBonus * 0.1) * 10 ** 18));
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, expectedStakingBonus * 0.1);
    });

    it('check the lack of funds for the payment of bonuses: no payments', async () => {
        await stakingService.setReferralMultiplier(5000);
        await stakingService.setReferrerMultipliers([
            {stakedAmountInUsdt: 33, multiplier: 2500},
            {stakedAmountInUsdt: 44, multiplier: 600},
            {stakedAmountInUsdt: 55, multiplier: 7000}
        ]);
        await stakingService.stakeFrom(userWithReferrer, toWei(toBN(6)));
        let expectedStakingBonus = (1 / (10 + 6)) * 6;
        await nmx.setMaxDirectBonus(toBN(0));
        await updateStakerAndVerify(userWithReferrer, expectedStakingBonus, 0, 0);
    });

    async function updateStakerAndVerify(user, stakingBonusAmount, referralBonusAmount, referrerBonusAmount) {
        let initialReferral = await stakingService.stakers(user);
        let referrer = await stakingService.referrers(user);
        let initialReferrer = await stakingService.stakers(referrer);

        let tx = await stakingService.getReward({from: user});

        let finalReferral = await stakingService.stakers(user);
        let finalReferrer = await stakingService.stakers(referrer);

        let referralBonuses = toBN((stakingBonusAmount + referralBonusAmount) * 10 ** 18);
        let expectedReferralReward = initialReferral.reward.add(referralBonuses);
        assertBN(finalReferral.reward, expectedReferralReward, "referral reward");

        let referrerBonuses = toBN(referrerBonusAmount * 10 ** 18);
        let expectedReferrerReward = initialReferrer.reward.add(referrerBonuses);
        assertBN(finalReferrer.reward, expectedReferrerReward, "referrer reward");

        truffleAssert.eventEmitted(tx, 'StakingBonusAccrued', (ev) => {
            return ev.staker === user && comparesEqualBN(ev.amount, stakingBonusAmount);
        });
        if (referrer !== ZERO_ADDRESS && stakingBonusAmount !== 0) {
            truffleAssert.eventEmitted(tx, 'ReferralBonusAccrued', (ev) => {
                return ev.referral === user && comparesEqualBN(ev.amount, referralBonusAmount);
            });
            truffleAssert.eventEmitted(tx, 'ReferrerBonusAccrued', (ev) => {
                return ev.referrer === referrer && comparesEqualBN(ev.amount, referrerBonusAmount);
            });
        } else {
            truffleAssert.eventNotEmitted(tx, 'ReferralBonusAccrued');
            truffleAssert.eventNotEmitted(tx, 'ReferrerBonusAccrued');
        }

    }

});

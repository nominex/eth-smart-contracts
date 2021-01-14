const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const StakingService = artifacts.require("StakingService");
const {rpcCommand, signData} = require("../../lib/utils.js");
const truffleAssert = require('truffle-assertions');

let toBN = web3.utils.toBN;
let toWei = web3.utils.toWei;
let fromWei = web3.utils.fromWei;

contract('StakingService#claimReward', (accounts) => {

    let nmx;
    let stakingService;
    let snapshotId;
    let user;

    before(async () => {
        nmx = await MockedNmxToken.new();
        let stakingToken = await MockedStakingToken.new();
        stakingService = await StakingService.new(nmx.address, stakingToken.address, nmx.address);

        user = accounts[1];
        await stakingToken.transfer(user, toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: user});

        await stakingToken.transfer(accounts[3], toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: accounts[3]});
        await stakingService.stakeFrom(accounts[3], toWei(toBN(10)));
    });

    beforeEach(async () => {
        snapshotId = await rpcCommand("evm_snapshot");
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('try to claim reward without staking', async () => {
        await claimRewardAndVerify(user, 0, 0);
    });

    it('claim first reward', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(6)));
        await claimRewardAndVerify(user, 0.0625 * 6, 0.0625 * 6);
    });

    it('claim reward after partial unstake', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await stakingService.unstake(toWei(toBN(4)), {from: user});
        await claimRewardAndVerify(user, 0.05 * 10 + 0.0625 * 6, 0.05 * 10 + 0.0625 * 6);
    });

    it('can claim prize after exiting staking program', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await stakingService.unstake(toWei(toBN(10)), {from: user});
        await claimRewardAndVerify(user, 0.05 * 10, 0.05 * 10);
    });

    it('rewards are not credited after exiting staking program', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await stakingService.unstake(toWei(toBN(10)), {from: user});
        await stakingService.claimReward({from: user});
        await claimRewardAndVerify(user, 0.05 * 10, 0);
    });

    it('claim reward twice in a row at different times', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await stakingService.claimReward({from: user});
        await claimRewardAndVerify(user, 0.05 * 10 * 2, 0.05 * 10);
    });

    it('claim reward twice in a row at the same times', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await stakingService.claimReward({from: user});
        await nmx.setSupply(0);
        await claimRewardAndVerify(user, 0.05 * 10, 0);
    });

    it('claim reward with first stake at the same times', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await nmx.setSupply(0);
        await stakingService.claimReward({from: user});
        await claimRewardAndVerify(user, 0, 0);
    });

    it('claim reward while paused', async () => {
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        await stakingService.updateHistoricalRewardRate();
        await stakingService.pause({from: accounts[0]});
        await claimRewardAndVerify(user, 0.05 * 10, 0.05 * 10);
    });

    async function claimRewardAndVerify(user, nmxBalance, rewardAmount) {
        let tx = await stakingService.claimReward({from: user});
        assert.equal(nmxBalance, fromWei(await nmx.balanceOf(user)), "nmx balance");
        truffleAssert.eventEmitted(tx, 'Rewarded', (ev) => {
            return ev.from === user && ev.to === user && fromWei(ev.amount) === rewardAmount.toString();
        });
    }

});

contract('StakingService#claimWithAuthorization', async accounts => {

    let nmx;
    let stakingService;
    let snapshotId;
    let user;

    before(async () => {
        nmx = await MockedNmxToken.new();
        let stakingToken = await MockedStakingToken.new();
        stakingService = await StakingService.new(nmx.address, stakingToken.address, nmx.address);

        user = accounts[1];
        await stakingToken.transfer(user, toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: user});

        await stakingToken.transfer(accounts[3], toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: accounts[3]});
        await stakingService.stakeFrom(accounts[3], toWei(toBN(10)));
    });

    beforeEach(async () => {
        snapshotId = await rpcCommand("evm_snapshot");
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    async function defaultPermitInfo(value) {
        return {
            owner: accounts[0],
            spender: user,
            value: value.toString(),
            deadline: Math.floor(Date.now() / 1000) + 120,
            nonce: 0,
            verifyingContract: stakingService.address,
            /*
            ganache returns different numbers for invocation from the contract and javascript
            from the documentation: For legacy reasons, the default is currently `1337` for `eth_chainId` RPC and `1` for the `CHAINID` opcode. This will be fixed in the next major version of ganache-cli and ganache-core!
            */
            // chainId: await web3.eth.getChainId(),
            chainId: 1,
            name: "StakingService",
            version: "1"
        }
    }

    const createPermitMessageData = function (permitInfo) {
        const message = {
            owner: permitInfo.owner,
            spender: permitInfo.spender,
            value: permitInfo.value,
            nonce: permitInfo.nonce,
            deadline: permitInfo.deadline
        };
        const typedData = {
            types: {
                EIP712Domain: [
                    {name: "name", type: "string"},
                    {name: "version", type: "string"},
                    {name: "chainId", type: "uint256"},
                    {name: "verifyingContract", type: "address"}
                ],
                Claim: [
                    {name: "owner", type: "address"},
                    {name: "spender", type: "address"},
                    {name: "value", type: "uint256"},
                    {name: "nonce", type: "uint256"},
                    {name: "deadline", type: "uint256"}
                ],
            },
            primaryType: "Claim",
            domain: {
                name: permitInfo.name,
                version: permitInfo.version,
                chainId: permitInfo.chainId,
                verifyingContract: permitInfo.verifyingContract,
            },
            message: message
        };
        return typedData;
    };

    it('signAmount can be equal to nmxAmount', async () => {
        let nmxAmount = toWei(toBN(0.05 * 8 * 1000), "milli");
        let signAmount = nmxAmount;
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        let tx = await stakingService.claimWithAuthorization(permitInfo.owner, nmxAmount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
        assert(nmxAmount.eq(await nmx.balanceOf(user)), "nmx balance");
        truffleAssert.eventEmitted(tx, 'Rewarded', (ev) => {
            return ev.from === user && ev.to === user && ev.amount.eq(nmxAmount);
        });
    });

    it('signAmount cannot be less than nmxAmount', async () => {
        let nmxAmount = toWei(toBN(0.05 * 8 * 1000), "milli");
        let signAmount = nmxAmount.subn(1);
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, nmxAmount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMXSTKSRV: INVALID_NMX_AMOUNT'), error.message);
        }
    });

    it('cannot claim greater than the unclaimed reward', async () => {
        let nmxAmount = toWei(toBN(0.05 * 10 * 1000), "milli").addn(1);
        let signAmount = nmxAmount.addn(10);
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, nmxAmount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMXSTKSRV: NOT_ENOUGH_BALANCE'), error.message);
        }
    });

    it('reward is paid by nmxAmount (not by signedAmount)', async () => {
        let nmxAmount = toWei(toBN(0.05 * 8 * 1000), "milli");
        let signAmount = nmxAmount.addn(1);
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        let tx = await stakingService.claimWithAuthorization(permitInfo.owner, nmxAmount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
        assert(nmxAmount.eq(await nmx.balanceOf(user)), "nmx balance");
        truffleAssert.eventEmitted(tx, 'Rewarded', (ev) => {
            return ev.from === user && ev.to === user && ev.amount.eq(nmxAmount);
        });
    });

    it('can claim whole reward', async () => {
        let nmxAmount = toWei(toBN(0.05 * 10 * 1000), "milli");
        let signAmount = nmxAmount;
        await stakingService.stakeFrom(user, toWei(toBN(10)));
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        let tx = await stakingService.claimWithAuthorization(permitInfo.owner, nmxAmount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
        assert(nmxAmount.eq(await nmx.balanceOf(user)), "nmx balance");
        truffleAssert.eventEmitted(tx, 'Rewarded', (ev) => {
            return ev.from === user && ev.to === user && ev.amount.eq(nmxAmount);
        });
    });

    it('expired deadline', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.deadline = 1;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMXSTKSRV: EXPIRED'), error.message);
        }
    });

    it('incorrect nonce', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.nonce++;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMX: INVALID_SIGNATURE'), error.message);
        }
    });

    it('incorrect chainId', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.chainId++;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMX: INVALID_SIGNATURE'), error.message);
        }
    });

    it('incorrect verifyingContract address', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.verifyingContract = accounts[0];
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMX: INVALID_SIGNATURE'), error.message);
        }
    });

    it('wrong signature', async () => {
        const permitInfo = await defaultPermitInfo(1);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);
        sign.v = sign.v >= 99 ? sign.v - 1 : sign.v + 1;

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMX: INVALID_SIGNATURE'), error.message);
        }
    });

    it('wrong signer', async () => {
        const permitInfo = await defaultPermitInfo(1);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[1], typedData);

        try {
            await stakingService.claimWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert(false, "Error not occurred")
        } catch (error) {
            assert(error.message.includes('NMX: INVALID_SIGNATURE'), error.message);
        }
    });

});


const Nmx = artifacts.require("Nmx");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const MockedStakingToken = artifacts.require("MockedStakingToken");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");
const { rpcCommand, signData } = require("../../lib/utils.js");
const truffleAssert = require('truffle-assertions');

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract('StakingService#staking', (accounts) => {

    const initialBalance = 1000;

    let nmx;
    let stakingToken;
    let stakingService;
    let snapshotId;
    let stakingRouter;

    before(async () => {
        nmx = await Nmx.deployed();

        stakingToken = await MockedStakingToken.new();

        stakingRouter = await StakingRouter.new(nmx.address);
        nmx.transferPoolOwnership(1, stakingRouter.address);

        stakingService = await StakingService.new(nmx.address, stakingToken.address, stakingRouter.address);
        stakingRouter.changeStakingServiceShares(new Array(stakingService.address), new Array(1).fill(1));

        await stakingToken.transfer(accounts[1], toWei(toBN(initialBalance)));
        await stakingToken.approve(stakingService.address, toWei(toBN(initialBalance)), { from: accounts[1] });
        await stakingToken.transfer(accounts[3], toWei(toBN(100)));
        await stakingToken.approve(stakingService.address, toWei(toBN(50)), { from: accounts[3] });
        await stakingToken.transfer(accounts[4], toWei(toBN(50)));
        await stakingToken.approve(stakingService.address, toWei(toBN(100)), { from: accounts[4] });
    });
    
    beforeEach(async () => {
        // snaphot must be taken before each test because of the issue in ganache
        // evm_revert also deletes the saved snapshot
        // https://github.com/trufflesuite/ganache-cli/issues/138
        snapshotId = await rpcCommand("evm_snapshot");
        await verifyStakedAmount(0);
    });

    afterEach(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
    });

    it('stake', async () => {
        await stakeAndVerify(10, 10);
    });

    it('unstake', async () => {
        await stakeAndVerify(10, 10);
        await unstakeAndVerify(10, 0);
    });

    it('unstake more than staked', async () => {
        try {
            await stakeAndVerify(10, 10);
            await unstake(11);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NOT_ENOUGH_STAKED"), `Unexpected error message: ${e.message}`);
            await verifyStakedAmount(10);
        }
    });

    it('stake in 2 stages', async () => {
        await stakeAndVerify(10, 10);
        await stakeAndVerify(6, 16);
        await unstakeAndVerify(16, 0);
    });

    it('unstake in 2 stages', async () => {
        await stakeAndVerify(10, 10);
        await unstakeAndVerify(6, 4);
        await unstakeAndVerify(4, 0);
    });

    it('stake/unstake with 0 amount', async () => {
        await stakeAndVerify(0, 0);
        await unstakeAndVerify(0, 0);

        await stakeAndVerify(5, 5);

        await unstakeAndVerify(0, 5);
        await unstakeAndVerify(0, 5);
    });

    it('unstake with 0 balance', async () => {
        try {
            await unstake(1);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NOT_ENOUGH_STAKED"), `Unexpected error message: ${e.message}`);
        }
    });

    it('stake negative amount', async () => {
        try {
            await stake(-1);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("INVALID_ARGUMENT"), `Unexpected error message: ${e.message}`);
        }
    });

    it('unstake negative amount', async () => {
        try {
            await unstake(-1);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("INVALID_ARGUMENT"), `Unexpected error message: ${e.message}`);
        }
    });

    it('stake when paused', async () => {
        try {
            await stakingService.pause();
            await stakeAndVerify(10, 10);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("Pausable: paused"), `Unexpected error message: ${e.message}`);
        }
    });

    it('unstake when paused and stake after unpause', async () => {
        await stakeAndVerify(10, 10);
        await stakingService.pause();
        await unstakeAndVerify(4, 6);

        await stakingService.unpause();
        await stakeAndVerify(14, 20);
        await unstakeAndVerify(5, 15);
        await stakingService.pause();
        await unstakeAndVerify(15, 0);
    });

    it('stake not allowed amount', async () => {
        await stakingService.stakeFrom(accounts[3], toWei(toBN(49)), { from: accounts[2] });
        assert.equal(49, fromWei((await stakingService.stakers(accounts[3])).amount), "staked amount");
        assert.equal(49, fromWei(await stakingToken.balanceOf(stakingService.address)), "stakingService balance");
        assert.equal(51, fromWei(await stakingToken.balanceOf(accounts[3])), "account3 balance");

        try {
            await stakingService.stakeFrom(accounts[3], toWei(toBN(2)), { from: accounts[2] });
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("transfer amount exceeds allowance"), `Unexpected error message: ${e.message}`);
        }
    });

    it('stake when not enough balance', async () => {
        await stakingService.stakeFrom(accounts[4], toWei(toBN(49)), { from: accounts[2] });
        assert.equal(49, fromWei((await stakingService.stakers(accounts[4])).amount), "staked amount");
        assert.equal(49, fromWei(await stakingToken.balanceOf(stakingService.address)), "stakingService balance");
        assert.equal(1, fromWei(await stakingToken.balanceOf(accounts[4])), "account4 balance");

        try {
            await stakingService.stakeFrom(accounts[4], toWei(toBN(2)), { from: accounts[2] });
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("transfer amount exceeds balance"), `Unexpected error message: ${e.message}`);
        }
    });

    it('total staked', async () => {
        await stakingService.stakeFrom(accounts[1], toWei(toBN(40)), { from: accounts[2] });
        assert.equal(40, fromWei((await stakingService.state()).totalStaked), "totalStaked");
        assert.equal(0, fromWei((await stakingService.state()).historicalRewardRate), "totalStaked");

        await stakingService.stakeFrom(accounts[3], toWei(toBN(20)), { from: accounts[2] });
        await stakingService.unstake(toWei(toBN(5)), { from: accounts[1] });
        assert.equal(55, fromWei((await stakingService.state()).totalStaked), "totalStaked");
        assert.equal(0, fromWei((await stakingService.state()).historicalRewardRate), "totalStaked");

        await stakingService.stakeFrom(accounts[4], toWei(toBN(30)), { from: accounts[2] });
        await stakingService.unstake(toWei(toBN(5)), { from: accounts[3] });
        assert.equal(80, fromWei((await stakingService.state()).totalStaked), "totalStaked");
        assert.equal(0, fromWei((await stakingService.state()).historicalRewardRate), "totalStaked");
    });

    async function getStakedBalance() {
        return (await stakingService.stakers(accounts[1])).amount;
    }

    async function verifyStakedAmount(expectedBalance) {
        assert.equal(expectedBalance, fromWei(await getStakedBalance()), "staked amount");
        assert.equal(expectedBalance, fromWei(await stakingToken.balanceOf(stakingService.address)), "stakingService balance");
        assert.equal(initialBalance - expectedBalance, fromWei(await stakingToken.balanceOf(accounts[1])), "account1 balance");
    }

    async function stake(amountToStake) {
        return await stakingService.stakeFrom(accounts[1], toWei(toBN(amountToStake)), { from: accounts[2] });
    }

    async function unstake(amountToUnstake) {
        return await stakingService.unstake(toWei(toBN(amountToUnstake)), { from: accounts[1] });
    }

    async function stakeAndVerify(amountToStake, expectedBalance) {
        let tx = await stake(amountToStake);
        await verifyStakedAmount(expectedBalance);
        truffleAssert.eventEmitted(tx, 'Staked', (ev) => {
            return ev.owner === accounts[1] && fromWei(ev.amount) === amountToStake.toString();
        });
    }

    async function unstakeAndVerify(amountToUnstake, expectedBalance) {
        let tx = await unstake(amountToUnstake);
        await verifyStakedAmount(expectedBalance);
        truffleAssert.eventEmitted(tx, 'Unstaked', (ev) => {
            return ev.from === accounts[1] && ev.to === accounts[1] && fromWei(ev.amount) === amountToUnstake.toString();
        });
    }

});

contract('StakingService#unstakeWithAuthorization', async accounts => {

    let nmx;
    let stakingToken;
    let stakingService;
    let snapshotId;

    const unstakeOwner = accounts[3];
    const unstakeSpender = accounts[1];

    before(async () => {
        nmx = await MockedNmxToken.new();
        stakingToken = await MockedStakingToken.new();
        stakingService = await StakingService.new(nmx.address, stakingToken.address, nmx.address);

        await stakingToken.transfer(unstakeOwner, toWei(toBN(500)));
        await stakingToken.approve(stakingService.address, toWei(toBN(500)), {from: unstakeOwner});
        await stakingService.stakeFrom(unstakeOwner, toWei(toBN(10)));
        assert.notEqual(unstakeOwner, unstakeSpender, 'owner should be different to spender')
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

    async function defaultPermitInfo(value) {
        return {
            owner: unstakeOwner,
            spender: unstakeSpender,
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
                Unstake: [
                    {name: "owner", type: "address"},
                    {name: "spender", type: "address"},
                    {name: "value", type: "uint256"},
                    {name: "nonce", type: "uint256"},
                    {name: "deadline", type: "uint256"}
                ],
            },
            primaryType: "Unstake",
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

    it('signAmount can be equal to amount', async () => {
        let amount = toWei(toBN(7));
        let signAmount = amount;
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);
        await testSuccess(permitInfo, amount, signAmount, sign);
    });

    it('signAmount can not be less than amount', async () => {
        let amount = toWei(toBN(7));
        let signAmount = amount.subn(1);
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, amount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: INVALID_AMOUNT"), `Unexpected error message: ${e.message}`);
        }
    });

    it('cannot unstake greater than the staked amount', async () => {
        let amount = toWei(toBN(10)).addn(1);
        let signAmount = amount;
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, amount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: NOT_ENOUGH_STAKED"), `Unexpected error message: ${e.message}`);
        }
    });

    it('unstaked value is amount (not signedAmount)', async () => {
        let amount = toWei(toBN(7));
        let signAmount = amount.addn(1);
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);
        await testSuccess(permitInfo, amount, signAmount, sign);
    });

    it('can unstake whole amount', async () => {
        let amount = toWei(toBN(10));
        let signAmount = amount;
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);
        await testSuccess(permitInfo, amount, signAmount, sign);
    });


    it('amout can be unstaked if the service is on a pause', async () => {
        let amount = toWei(toBN(4));
        let signAmount = amount;
        const permitInfo = await defaultPermitInfo(signAmount);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);
        await stakingService.pause();
        await testSuccess(permitInfo, amount, signAmount, sign);
    });

    it('error on expired deadline', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.deadline = 1;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMXSTKSRV: EXPIRED"), `Unexpected error message: ${e.message}`);
        }
    });

    it('error on incorrect nonce', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.nonce++;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: INVALID_SIGNATURE"), `Unexpected error message: ${e.message}`);
        }
    });

    it('error on incorrect chainId', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.chainId++;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: INVALID_SIGNATURE"), `Unexpected error message: ${e.message}`);
        }
    });

    it('error on incorrect verifyingContract address', async () => {
        const permitInfo = await defaultPermitInfo(1);
        permitInfo.verifyingContract = accounts[0];
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: INVALID_SIGNATURE"), `Unexpected error message: ${e.message}`);
        }
    });

    it('error on wrong signature', async () => {
        const permitInfo = await defaultPermitInfo(1);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(permitInfo.owner, typedData);
        sign.v = sign.v >= 99 ? sign.v - 1 : sign.v + 1;

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: INVALID_SIGNATURE"), `Unexpected error message: ${e.message}`);
        }
    });

    it('error on wrong signer', async () => {
        const permitInfo = await defaultPermitInfo(1);
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[1], typedData);

        try {
            await stakingService.unstakeWithAuthorization(permitInfo.owner, permitInfo.value, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: INVALID_SIGNATURE"), `Unexpected error message: ${e.message}`);
        }
    });

    async function testSuccess(permitInfo, amount, signAmount, sign) {
        let initialOwnerBalance = await stakingToken.balanceOf(unstakeOwner);
        let initialOwnerStakedAmount = (await stakingService.stakers(unstakeOwner)).amount;
        let initialSpenderBalance = await stakingToken.balanceOf(unstakeSpender);
        let initialSpenderStakedAmount = (await stakingService.stakers(unstakeSpender)).amount;
        let initialServiceBalance = await stakingToken.balanceOf(stakingService.address);

        let tx = await stakingService.unstakeWithAuthorization(permitInfo.owner, amount, signAmount, permitInfo.deadline, sign.v, sign.r, sign.s, {from: permitInfo.spender});

        let finalOwnerBalance = await stakingToken.balanceOf(unstakeOwner);
        let finalOwnerStakedAmount = (await stakingService.stakers(unstakeOwner)).amount;
        let finalSpenderBalance = await stakingToken.balanceOf(unstakeSpender);
        let finalSpenderStakedAmount = (await stakingService.stakers(unstakeSpender)).amount;
        let finalServiceBalance = await stakingToken.balanceOf(stakingService.address);

        assert.equal(fromWei(initialOwnerBalance), fromWei(finalOwnerBalance), "owner balance");
        assert.equal(fromWei(initialOwnerStakedAmount.sub(amount)), fromWei(finalOwnerStakedAmount), "owner staked amount");
        assert.equal(fromWei(initialSpenderBalance.add(amount)), fromWei(finalSpenderBalance), "spender balance");
        assert.equal(fromWei(initialSpenderStakedAmount), fromWei(finalSpenderStakedAmount), "spender staked amount");
        assert.equal(fromWei(initialServiceBalance.sub(amount)), fromWei(finalServiceBalance), "service balance");
        truffleAssert.eventEmitted(tx, 'Unstaked', (ev) => {
            return ev.from === unstakeOwner && ev.to === unstakeSpender && ev.amount.eq(amount);
        });
    }

});

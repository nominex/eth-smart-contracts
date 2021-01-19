const Nmx = artifacts.require('Nmx');
const MintScheduleStub = artifacts.require('MintScheduleStub');
const { signData, ZERO } = require("../lib/utils.js");

contract('Nmx - initializing', accounts => {
    let nmx;

    beforeEach(async () => {
        const mintScheduleStub = await MintScheduleStub.new();
        nmx = await Nmx.new(mintScheduleStub.address);
    });

    it('already distributed nmx minted to sender address', async () => {
        const balance = await nmx.balanceOf(accounts[0]);
        assert(balance.gt(ZERO), `Unexpected initial balance of the sender ${balance}`);
    });

    it('default state initialized with 0 nextTickSupply', async () => {
        await nmx.transferPoolOwnership(0, accounts[0]);
        const rewardRate = await nmx.supplyNmx.call();
        assert(rewardRate.isZero(), `Unexpected nmxSupply ${rewardRate}, schedule states are likely not to be initialized properly`);
    });

    it('primary state initialized with non 0 nextTickSupply', async () => {
        await nmx.transferPoolOwnership(1, accounts[0]);
        const rewardRate = await nmx.supplyNmx.call();
        assert(rewardRate.gt(ZERO), `Unexpected nmxSupply ${rewardRate}, schedule states are likely not to be initialized properly`);
    });

    it('bonus state initialized with non 0 nextTickSupply', async () => {
        await nmx.transferPoolOwnership(2, accounts[0]);
        const rewardRate = await nmx.supplyNmx.call();
        assert(rewardRate.gt(ZERO), `Unexpected nmxSupply ${rewardRate}, schedule states are likely not to be initialized properly`);
    });

    it('team state initialized with non 0 nextTickSupply', async () => {
        await nmx.transferPoolOwnership(3, accounts[0]);
        const rewardRate = await nmx.supplyNmx.call();
        assert(rewardRate.gt(ZERO), `Unexpected nmxSupply ${rewardRate}, schedule states are likely not to be initialized properly`);
    });

    it('nominex state initialized with non 0 nextTickSupply', async () => {
        await nmx.transferPoolOwnership(4, accounts[0]);
        const rewardRate = await nmx.supplyNmx.call();
        assert(rewardRate.gt(ZERO), `Unexpected nmxSupply ${rewardRate}, schedule states are likely not to be initialized properly`);
    });
});

contract('Nmx - transfer pool ownership', accounts => {
    let nmx;

    beforeEach(async () => {
        const mintScheduleStub = await MintScheduleStub.new();
        nmx = await Nmx.new(mintScheduleStub.address);
    });

    it('transfer to current same pool owner fails', async () => {
        await nmx.transferPoolOwnership(1, accounts[0]);
        try {
            await nmx.transferPoolOwnership(1, accounts[0]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: new owner must differs from the old one"), `Unexpected error message: ${e.message}`);
        }
    });

    it('arbitrary sender can not transfer ownership', async () => {
        try {
            await nmx.transferPoolOwnership(1, accounts[1], { from: accounts[1] });
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: only owner can transfer pool ownership"), `Unexpected error message: ${e.message}`);
        }
    });

    it('current pool owner can transfer ownership', async () => {
        await nmx.transferPoolOwnership(1, accounts[1]);
        await nmx.transferPoolOwnership(1, accounts[2], { from: accounts[1] });
    });

    it('current contract owner can transfer ownership', async () => {
        await nmx.transferPoolOwnership(1, accounts[1]);
        await nmx.transferPoolOwnership(1, accounts[2]);
    });

    it('can not transfer ownership to owner of another pool', async () => {
        await nmx.transferPoolOwnership(1, accounts[1]);
        try {
            await nmx.transferPoolOwnership(2, accounts[1]);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: every pool must have dedicated owner"), `Unexpected error message: ${e.message}`);
        }

    });

    it('address can receive ownership after transfering its own', async () => {
        await nmx.transferPoolOwnership(1, accounts[1]);
        await nmx.transferPoolOwnership(1, accounts[2]);
        await nmx.transferPoolOwnership(2, accounts[1]);
    });

    it('old owner got 0 nmx on supplyNmx invocation', async () => {
        await nmx.transferPoolOwnership(1, accounts[0]);
        await nmx.transferPoolOwnership(1, accounts[1]);
        const rewardRate = await nmx.supplyNmx.call();
        assert(rewardRate.isZero(), `Unexpected rewardRate after pool ownership loosing ${rewardRate}`);
    });
});

contract('Nmx - supplyNmx', accounts => {
    let nmx;

    before(async () => {
        const mintScheduleStub = await MintScheduleStub.new();
        nmx = await Nmx.new(mintScheduleStub.address);
        for (let i = 1; i < 5; i++) {
            await nmx.transferPoolOwnership(i, accounts[i]);
        }
    });

    it('arbitrary caller got 0', async () => {
        const rewardRate = await nmx.supplyNmx.call({ from: accounts[6] });
        assert(rewardRate.isZero(), `Unexpected rewardRate for arbitrary caller ${rewardRate}`);
    });

    it('pool owner got gt 0', async () => {
        const rewardRate = await nmx.supplyNmx.call({ from: accounts[1] });
        assert(rewardRate.gt(ZERO), `Unexpected rewardRate for arbitrary caller ${rewardRate}`);
    });

    it('pool owner actually got nmx on balance', async () => {
        const initialBalance = await nmx.balanceOf(accounts[1]);
        const rewardRate = await nmx.supplyNmx.call({ from: accounts[1] });
        await nmx.supplyNmx({ from: accounts[1] });
        const finalBalance = await nmx.balanceOf(accounts[1]);
        assert(rewardRate.gt(ZERO), `Unexpected rewardRate for poolOwner ${rewardRate}`);
        assert(finalBalance.sub(initialBalance).eq(rewardRate), `balance change does not match the rewardRate ${initialBalance} ${finalBalance} ${rewardRate}`);
    });

    it('pool state changes', async () => {
        const initialState = await nmx.poolMintStates(1);
        await nmx.supplyNmx({ from: accounts[1] });
        const finalState = await nmx.poolMintStates(1);
        assert.notDeepEqual(finalState, initialState, 'State was not changed');
    });

    it('another pool state does not change', async () => {
        const initialState = await nmx.poolMintStates(1);
        await nmx.supplyNmx({ from: accounts[2] });
        const finalState = await nmx.poolMintStates(1);
        assert.deepEqual(finalState, initialState, 'Another pool state was changed');
    });
});

contract('Nmx - rewardRate', accounts => {
    let nmx;

    before(async () => {
        const mintScheduleStub = await MintScheduleStub.new();
        nmx = await Nmx.new(mintScheduleStub.address);
    });

    it('non zero value returned', async () => {
        const rewardRate = await nmx.rewardRate();
        assert(rewardRate.gt(ZERO), `Unexpected rewardRate ${rewardRate}`);
    });

    it('primary pool are used to calc the rate', async () => {
        const expectedRate = (await nmx.poolMintStates(1)).nextTickSupply.mul(web3.utils.toBN(4));
        const rewardRate = await nmx.rewardRate();
        assert(rewardRate.eq(expectedRate), `Reward rate ne to nextTickSupply*4. Probably wrong pool was passed ${expectedRate} ${rewardRate}`);
    });
});

contract('Nmx - permit', async accounts => {
    let nmx;

    before(async () => {
        const mintScheduleStub = await MintScheduleStub.new();
        nmx = await Nmx.new(mintScheduleStub.address);
    });

    async function defaultPermitInfo() {
        return {
            owner: accounts[0],
            spender: accounts[1],
            value: '' + 1n * 10n ** 18n,
            deadline: Math.floor(Date.now() / 1000) + 120,
            nonce: await nmx.nonces(accounts[0]),
            verifyingContract: nmx.address,
            /*
            ganache returns different numbers for invocation from the contract and javascript
            from the documentation: For legacy reasons, the default is currently `1337` for `eth_chainId` RPC and `1` for the `CHAINID` opcode. This will be fixed in the next major version of ganache-cli and ganache-core!
            */
            // chainId: await web3.eth.getChainId(),
            chainId: 1,
            name: await nmx.name(),
            version: "1"
        }
    };

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
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" }
                ],
            },
            primaryType: "Permit",
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

    it('permit success with correct amount', async () => {
        const permitInfo = await defaultPermitInfo();
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);
        assert(ZERO.eq(await nmx.allowance(accounts[0], accounts[1])));
        await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
        assert(!web3.utils.toBN(permitInfo.value).isZero());
        assert(web3.utils.toBN(permitInfo.value).eq(await nmx.allowance(accounts[0], accounts[1])));
    });

    it('expired deadline', async () => {
        const permitInfo = await defaultPermitInfo();
        permitInfo.deadline = 1;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: deadline expired"), `Unexpected error message: ${e.message}`);
        }
    });

    it('incorrect nonce', async () => {
        const permitInfo = await defaultPermitInfo();
        permitInfo.nonce++;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: invalid signature"), `Unexpected error message: ${e.message}`);
        }
    });

    it('incorrect chainId', async () => {
        const permitInfo = await defaultPermitInfo();
        permitInfo.chainId++;
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: invalid signature"), `Unexpected error message: ${e.message}`);
        }
    });

    it('incorrect verifyingContract address', async () => {
        const permitInfo = await defaultPermitInfo();
        permitInfo.verifyingContract = accounts[0];
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);

        try {
            await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: invalid signature"), `Unexpected error message: ${e.message}`);
        }
    });

    it('wrong signature', async () => {
        const permitInfo = await defaultPermitInfo();
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[0], typedData);
        sign.v = sign.v >= 99 ? sign.v - 1 : sign.v + 1;

        try {
            await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: invalid signature"), `Unexpected error message: ${e.message}`);
        }
    });

    it('wrong signer', async () => {
        const permitInfo = await defaultPermitInfo();
        const typedData = createPermitMessageData(permitInfo);
        const sign = await signData(accounts[1], typedData);

        try {
            await nmx.permit(permitInfo.owner, permitInfo.spender, permitInfo.value, permitInfo.deadline, sign.v, sign.r, sign.s);
            assert.fail("Error not occurred");
        } catch (e) {
            assert(e.message.includes("NMX: invalid signature"), `Unexpected error message: ${e.message}`);
        }
    });

});

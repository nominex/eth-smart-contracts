const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const SetReferrerProxy = artifacts.require("SetReferrerProxy");
const StakingService = artifacts.require("StakingService");
const { rpcCommand, ZERO_ADDRESS, signData } = require("../utils.js");
const truffleAssert = require("truffle-assertions");

contract("StakingService#setReferrer", (accounts) => {
  let stakingService;
  let setReferrerProxy;
  let snapshotId;

  const userWithoutReferrer = accounts[1];
  const userWithReferrer = accounts[2];

  before(async () => {
    let nmx = await MockedNmxToken.new();
    let usdtToken = await MockedUsdtToken.new();
    let stakingToken = await MockedStakingToken.new(usdtToken.address);
    stakingService = await StakingService.new(
      nmx.address,
      stakingToken.address,
      nmx.address
    );
    setReferrerProxy = await SetReferrerProxy.new(stakingService.address);

    await stakingService.setReferrer(accounts[4], { from: userWithReferrer });
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

  it("can not set zero address as a referrer", async () => {
    try {
      await stakingService.setReferrer(ZERO_ADDRESS, {
        from: userWithoutReferrer,
      });
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NmxStakingService: INVALID_REFERRER"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("can not set the same referrer twice", async () => {
    try {
      await stakingService.setReferrer(accounts[4], { from: userWithReferrer });
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NmxStakingService: INVALID_REFERRER"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("can not change a referrer", async () => {
    try {
      await stakingService.setReferrer(accounts[5], { from: userWithReferrer });
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NmxStakingService: INVALID_REFERRER"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("can not set yourself as a referrer", async () => {
    try {
      await stakingService.setReferrer(userWithoutReferrer, {
        from: userWithoutReferrer,
      });
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NmxStakingService: INVALID_REFERRER"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("can set referrer of a user without a referrer", async () => {
    await test(userWithoutReferrer, accounts[5]);
  });

  it("one referrer can have several referrals", async () => {
    await test(userWithoutReferrer, accounts[4]);
  });

  it("can set referrer of a user with a referrer", async () => {
    await test(userWithoutReferrer, userWithReferrer);
  });

  it("can set your referral as a referrer", async () => {
    await test(accounts[4], userWithReferrer);
  });

  it("can't set a referral through another contract", async () => {
    let setReferrerProxyTx = await setReferrerProxy.setReferrer(accounts[5], {
      from: userWithoutReferrer,
    });
    let stakingServiceTx = await truffleAssert.createTransactionResult(
      stakingService,
      setReferrerProxyTx.tx
    );
    truffleAssert.eventEmitted(stakingServiceTx, "ReferrerChanged", (ev) => {
      return ev.referral === setReferrerProxy.address && ev.referrer === accounts[5];
    });
    await assertReferrer(setReferrerProxy.address, accounts[5]);
  });

  async function test(referral, referrer) {
    let tx = await stakingService.setReferrer(referrer, { from: referral });
    truffleAssert.eventEmitted(tx, "ReferrerChanged", {
      referral: referral,
      referrer: referrer,
    });
    await assertReferrer(referral, referrer);
  }

  async function assertReferrer(referral, expectedReferrer) {
    let actualReferrer = await stakingService.referrers(referral);
    assert.equal(actualReferrer, expectedReferrer, "referrer");
  }
});

contract("StakingService#setReferrerWithAuthorization", (accounts) => {
  let stakingService;
  let setReferrerProxy;
  let snapshotId;

  const userWithoutReferrer = accounts[1];
  const userWithReferrer = accounts[2];

  before(async () => {
    let nmx = await MockedNmxToken.new();
    let usdtToken = await MockedUsdtToken.new();
    let stakingToken = await MockedStakingToken.new(usdtToken.address);
    stakingService = await StakingService.new(
        nmx.address,
        stakingToken.address,
        nmx.address
    );
    setReferrerProxy = await SetReferrerProxy.new(stakingService.address);

    await stakingService.setReferrer(accounts[4], { from: userWithReferrer });
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

  async function defaultPermitInfo(referral, referrer) {
    return {
      owner: referral,
      referrer: referrer,
      deadline: Math.floor(Date.now() / 1000) + 120,
      verifyingContract: stakingService.address,
      /*
            ganache returns different numbers for invocation from the contract and javascript
            from the documentation: For legacy reasons, the default is currently `1337` for `eth_chainId` RPC and `1` for the `CHAINID` opcode. This will be fixed in the next major version of ganache-cli and ganache-core!
            */
      // chainId: await web3.eth.getChainId(),
      chainId: 1,
      name: "StakingService",
      version: "1",
    };
  }

  const createPermitMessageData = function (permitInfo) {
    const message = {
      owner: permitInfo.owner,
      referrer: permitInfo.referrer,
      deadline: permitInfo.deadline,
    };
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        SetReferrer: [
          { name: "owner", type: "address" },
          { name: "referrer", type: "address" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: "SetReferrer",
      domain: {
        name: permitInfo.name,
        version: permitInfo.version,
        chainId: permitInfo.chainId,
        verifyingContract: permitInfo.verifyingContract,
      },
      message: message,
    };
    return typedData;
  };

  it("success", async () => {
    const permitInfo = await defaultPermitInfo(userWithoutReferrer, accounts[4]);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    let tx = await stakingService.setReferrerWithAuthorization(
        permitInfo.owner,
        permitInfo.referrer,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: accounts[5] }
    );
    truffleAssert.eventEmitted(tx, "ReferrerChanged", {
      referral: userWithoutReferrer,
      referrer: accounts[4],
    });
    await assertReferrer(userWithoutReferrer, accounts[4]);
  });

  it("error on expired deadline", async () => {
    const permitInfo = await defaultPermitInfo(userWithoutReferrer, accounts[4]);
    permitInfo.deadline = 1;
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.setReferrerWithAuthorization(
          permitInfo.owner,
          permitInfo.referrer,
          permitInfo.deadline,
          sign.v,
          sign.r,
          sign.s,
          { from: accounts[5] }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
          e.message.includes("NmxStakingService: EXPIRED"),
          `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on incorrect chainId", async () => {
    const permitInfo = await defaultPermitInfo(userWithoutReferrer, accounts[4]);
    permitInfo.chainId++;
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.setReferrerWithAuthorization(
          permitInfo.owner,
          permitInfo.referrer,
          permitInfo.deadline,
          sign.v,
          sign.r,
          sign.s,
          { from: accounts[5] }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
          e.message.includes("NmxStakingService: INVALID_SIGNATURE"),
          `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on incorrect verifyingContract address", async () => {
    const permitInfo = await defaultPermitInfo(userWithoutReferrer, accounts[4]);
    permitInfo.verifyingContract = accounts[0];
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.setReferrerWithAuthorization(
          permitInfo.owner,
          permitInfo.referrer,
          permitInfo.deadline,
          sign.v,
          sign.r,
          sign.s,
          { from: accounts[5] }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
          e.message.includes("NmxStakingService: INVALID_SIGNATURE"),
          `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on wrong signature", async () => {
    const permitInfo = await defaultPermitInfo(userWithoutReferrer, accounts[4]);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);
    sign.v = sign.v >= 99 ? sign.v - 1 : sign.v + 1;

    try {
      await stakingService.setReferrerWithAuthorization(
          permitInfo.owner,
          permitInfo.referrer,
          permitInfo.deadline,
          sign.v,
          sign.r,
          sign.s,
          { from: accounts[5] }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
          e.message.includes("NmxStakingService: INVALID_SIGNATURE"),
          `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on wrong signer", async () => {
    const permitInfo = await defaultPermitInfo(userWithoutReferrer, accounts[4]);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(accounts[3], typedData);

    try {
      await stakingService.setReferrerWithAuthorization(
          permitInfo.owner,
          permitInfo.referrer,
          permitInfo.deadline,
          sign.v,
          sign.r,
          sign.s,
          { from: accounts[5] }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
          e.message.includes("NmxStakingService: INVALID_SIGNATURE"),
          `Unexpected error message: ${e.message}`
      );
    }
  });

  async function assertReferrer(referral, expectedReferrer) {
    let actualReferrer = await stakingService.referrers(referral);
    assert.equal(actualReferrer, expectedReferrer, "referrer");
  }
});

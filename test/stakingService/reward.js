const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const StakingService = artifacts.require("StakingService");
const { rpcCommand, signData, ZERO, getAssertBN } = require("../utils.js");
const truffleAssert = require("truffle-assertions");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract("StakingService#claimReward", (accounts) => {
  const assertBN = getAssertBN(toWei(toBN(100), "mwei"));

  let nmx;
  let stakingService;
  let snapshotId;

  const user = accounts[1];

  before(async () => {
    nmx = await MockedNmxToken.new();
    let stakingToken = await MockedStakingToken.new();
    stakingService = await StakingService.new(
      nmx.address,
      stakingToken.address,
      nmx.address
    );

    await stakingToken.transfer(user, toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: user,
    });

    await stakingToken.transfer(accounts[3], toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: accounts[3],
    });
    await stakingService.stakeFrom(accounts[3], toWei(toBN(10)));
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

  it("reward without staking gives no changes", async () => {
    await claimRewardAndVerify(user, 0, 0);
  });

  it("reward after one stake is correct", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(6)));
    await claimRewardAndVerify(user, (1 / (10 + 6)) * 6, (1 / (10 + 6)) * 6);
  });

  it("reward after partial unstake is correct ", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await stakingService.unstake(toWei(toBN(4)), { from: user });
    await claimRewardAndVerify(
      user,
      (1 / (10 + 10)) * 10 + (1 / (10 + 6)) * 6,
      (1 / (10 + 10)) * 10 + (1 / (10 + 6)) * 6
    );
  });

  it("reward after full unstake is correct", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await stakingService.unstake(toWei(toBN(10)), { from: user });
    await claimRewardAndVerify(
      user,
      (1 / (10 + 10)) * 10,
      (1 / (10 + 10)) * 10
    );
  });

  it("no reward credited after exiting staking program", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await stakingService.unstake(toWei(toBN(10)), { from: user });
    await stakingService.claimReward({ from: user });
    await claimRewardAndVerify(user, (1 / (10 + 10)) * 10, 0);
  });

  it("total amount of few rewards is correct", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await stakingService.claimReward({ from: user });
    await claimRewardAndVerify(
      user,
      (1 / (10 + 10)) * 10 * 2,
      (1 / (10 + 10)) * 10
    );
  });

  it("total amount of few rewards is correct when Nmx mint schedule is over", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await stakingService.claimReward({ from: user });
    await nmx.setSupply(0);
    await claimRewardAndVerify(user, (1 / (10 + 10)) * 10, 0);
  });

  it("no reward if no nmx supplied to the service", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await nmx.setSupply(0);
    await stakingService.claimReward({ from: user });
    await claimRewardAndVerify(user, 0, 0);
  });

  it("reward can be claimed if the service is on a pause", async () => {
    await stakingService.stakeFrom(user, toWei(toBN(10)));
    await stakingService.pause();
    await claimRewardAndVerify(
      user,
      (1 / (10 + 10)) * 10,
      (1 / (10 + 10)) * 10
    );
  });

  async function claimRewardAndVerify(user, nmxBalance, rewardAmount) {
    const initialBalance = await nmx.balanceOf(user);
    let tx = await stakingService.claimReward({ from: user });
    const finalBalance = await nmx.balanceOf(user);
    let actualRewardAmount = finalBalance.sub(initialBalance);

    assertBN(finalBalance, nmxBalance, "nmx balance");
    assertBN(actualRewardAmount, rewardAmount, `reward amount`);
    truffleAssert.eventEmitted(tx, "Rewarded", (ev) => {
      return (
        ev.from === user &&
        ev.to === user &&
        fromWei(ev.amount) === fromWei(actualRewardAmount)
      );
    });
  }
});

contract("StakingService#claimRewardTo", (accounts) => {
  const assertBN = getAssertBN(toWei(toBN(10), "mwei"));

  let nmx;
  let stakingService;
  let snapshotId;

  const user1 = accounts[1];
  const user2 = accounts[2];

  before(async () => {
    nmx = await MockedNmxToken.new();
    let stakingToken = await MockedStakingToken.new();
    stakingService = await StakingService.new(
      nmx.address,
      stakingToken.address,
      nmx.address
    );

    await stakingToken.transfer(user1, toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: user1,
    });

    await stakingToken.transfer(user2, toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: user2,
    });

    await stakingToken.transfer(accounts[3], toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: accounts[3],
    });
    await stakingService.stakeFrom(accounts[3], toWei(toBN(10)));
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

  it("reward without staking gives no changes", async () => {
    await claimRewardToAndVerify(user1, user2, 0, 0);
  });

  it("reward to yourself address", async () => {
    await stakingService.stakeFrom(user1, toWei(toBN(6)));
    await claimRewardToAndVerify(
      user1,
      user1,
      (1 / (10 + 6)) * 6,
      (1 / (10 + 6)) * 6
    );
  });

  it("reward to another address", async () => {
    await stakingService.stakeFrom(user1, toWei(toBN(6)));
    await claimRewardToAndVerify(
      user1,
      user2,
      (1 / (10 + 6)) * 6,
      (1 / (10 + 6)) * 6
    );
  });

  it("reward to another address with a non-zero balance", async () => {
    await stakingService.stakeFrom(user1, toWei(toBN(6)));
    await stakingService.stakeFrom(user2, toWei(toBN(4)));
    await stakingService.claimRewardTo(user2, { from: user2 });
    await nmx.setSupply(0);

    let firstReward = (1 / (10 + 6 + 4)) * 4;
    let secondReward = (1 / (10 + 6)) * 6 + (1 / (10 + 6 + 4)) * 6;
    await claimRewardToAndVerify(
      user1,
      user2,
      firstReward + secondReward,
      secondReward
    );
  });

  it("reward can be claimed if the service is on a pause", async () => {
    await stakingService.stakeFrom(user1, toWei(toBN(10)));
    await stakingService.pause();
    await claimRewardToAndVerify(
      user1,
      user2,
      (1 / (10 + 10)) * 10,
      (1 / (10 + 10)) * 10
    );
  });

  async function claimRewardToAndVerify(from, to, nmxBalance, rewardAmount) {
    const initialBalanceFrom = await nmx.balanceOf(from);
    const initialBalanceTo = await nmx.balanceOf(to);
    let tx = await stakingService.claimRewardTo(to, { from: from });
    const finalBalanceFrom = await nmx.balanceOf(from);
    const finalBalanceTo = await nmx.balanceOf(to);
    let actualRewardAmount = finalBalanceTo.sub(initialBalanceTo);

    assertBN(finalBalanceTo, nmxBalance, "nmx balance of 'to'");
    assertBN(actualRewardAmount, rewardAmount, `reward amount`);
    if (from !== to)
      assert.deepEqual(
        initialBalanceFrom,
        finalBalanceFrom,
        "nmx balance of 'from'"
      );
    truffleAssert.eventEmitted(tx, "Rewarded", (ev) => {
      return (
        ev.from === from &&
        ev.to === to &&
        fromWei(ev.amount) === fromWei(actualRewardAmount)
      );
    });
  }
});

contract("StakingService#claimWithAuthorization", async (accounts) => {
  const assertBN = getAssertBN(0);

  let nmx;
  let stakingService;
  let snapshotId;

  const rewardOwner = accounts[3];
  const rewardSpender = accounts[0];

  before(async () => {
    nmx = await MockedNmxToken.new();
    let stakingToken = await MockedStakingToken.new();
    stakingService = await StakingService.new(
      nmx.address,
      stakingToken.address,
      nmx.address
    );

    await stakingToken.transfer(rewardOwner, toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: rewardOwner,
    });
    await stakingService.stakeFrom(rewardOwner, toWei(toBN(10)));
    assert.notEqual(
      rewardOwner,
      rewardSpender,
      "owner should be different to spender"
    );
  });

  beforeEach(async () => {
    // snaphot must be taken before each test because of the issue in ganache
    // evm_revert also deletes the saved snapshot
    // https://github.com/trufflesuite/ganache-cli/issues/138
    snapshotId = await rpcCommand("evm_snapshot");
    assert.deepEqual(
      await nmx.balanceOf(rewardSpender),
      ZERO,
      "initial rewardSpender Nmx balance"
    );
    assert.deepEqual(
      await nmx.balanceOf(rewardOwner),
      ZERO,
      "initial rewardOwner Nmx balance"
    );
  });

  afterEach(async () => {
    assert.deepEqual(
      await nmx.balanceOf(rewardOwner),
      ZERO,
      "final rewardOwner Nmx balance"
    );
    await rpcCommand("evm_revert", [snapshotId]);
  });

  async function defaultPermitInfo(value) {
    return {
      owner: rewardOwner,
      spender: rewardSpender,
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
      version: "1",
    };
  }

  const createPermitMessageData = function (permitInfo) {
    const message = {
      owner: permitInfo.owner,
      spender: permitInfo.spender,
      value: permitInfo.value,
      nonce: permitInfo.nonce,
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
        Claim: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      primaryType: "Claim",
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

  it("signAmount can be equal to nmxAmount", async () => {
    let nmxAmount = toWei(toBN(0.8 * 1000), "milli");
    let signAmount = nmxAmount;
    const permitInfo = await defaultPermitInfo(signAmount);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    let tx = await stakingService.claimWithAuthorization(
      permitInfo.owner,
      nmxAmount,
      signAmount,
      permitInfo.deadline,
      sign.v,
      sign.r,
      sign.s,
      { from: permitInfo.spender }
    );
    assertBN(nmxAmount, await nmx.balanceOf(rewardSpender), "nmx balance");
    truffleAssert.eventEmitted(tx, "Rewarded", (ev) => {
      return (
        ev.from === rewardOwner &&
        ev.to === rewardSpender &&
        ev.amount.eq(nmxAmount)
      );
    });
  });

  it("signAmount can not be less than nmxAmount", async () => {
    let nmxAmount = toWei(toBN(0.8 * 1000), "milli");
    let signAmount = nmxAmount.subn(1);
    const permitInfo = await defaultPermitInfo(signAmount);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        nmxAmount,
        signAmount,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMXSTKSRV: INVALID_NMX_AMOUNT"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("cannot claim greater than the unclaimed reward", async () => {
    await stakingService.updateHistoricalRewardRate();
    await nmx.setSupply(0);

    let nmxAmount = (
      await stakingService.getReward.call({ from: rewardOwner })
    ).addn(1);
    let signAmount = nmxAmount;
    const permitInfo = await defaultPermitInfo(signAmount);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        nmxAmount,
        signAmount,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMXSTKSRV: NOT_ENOUGH_BALANCE"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("rewarded amount is nmxAmount (not signedAmount)", async () => {
    let nmxAmount = toWei(toBN(0.8 * 1000), "milli");
    let signAmount = nmxAmount.addn(1);
    const permitInfo = await defaultPermitInfo(signAmount);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    let tx = await stakingService.claimWithAuthorization(
      permitInfo.owner,
      nmxAmount,
      signAmount,
      permitInfo.deadline,
      sign.v,
      sign.r,
      sign.s,
      { from: permitInfo.spender }
    );
    assertBN(nmxAmount, await nmx.balanceOf(rewardSpender), "nmx balance");
    truffleAssert.eventEmitted(tx, "Rewarded", (ev) => {
      return (
        ev.from === rewardOwner &&
        ev.to === rewardSpender &&
        ev.amount.eq(nmxAmount)
      );
    });
  });

  it("can claim whole reward", async () => {
    await stakingService.updateHistoricalRewardRate();
    await nmx.setSupply(0);

    let nmxAmount = await stakingService.getReward.call({ from: rewardOwner });
    let signAmount = nmxAmount;
    const permitInfo = await defaultPermitInfo(signAmount);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    let tx = await stakingService.claimWithAuthorization(
      permitInfo.owner,
      nmxAmount,
      signAmount,
      permitInfo.deadline,
      sign.v,
      sign.r,
      sign.s,
      { from: permitInfo.spender }
    );
    assertBN(nmxAmount, await nmx.balanceOf(rewardSpender), "nmx balance");
    truffleAssert.eventEmitted(tx, "Rewarded", (ev) => {
      return (
        ev.from === rewardOwner &&
        ev.to === rewardSpender &&
        ev.amount.eq(nmxAmount)
      );
    });
  });

  it("reward can be claimed if the service is on a pause", async () => {
    let nmxAmount = toWei(toBN(0.8 * 1000), "milli");
    let signAmount = nmxAmount;
    const permitInfo = await defaultPermitInfo(signAmount);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    await stakingService.pause();
    let tx = await stakingService.claimWithAuthorization(
      permitInfo.owner,
      nmxAmount,
      signAmount,
      permitInfo.deadline,
      sign.v,
      sign.r,
      sign.s,
      { from: permitInfo.spender }
    );
    assertBN(nmxAmount, await nmx.balanceOf(rewardSpender), "nmx balance");
    truffleAssert.eventEmitted(tx, "Rewarded", (ev) => {
      return (
        ev.from === rewardOwner &&
        ev.to === rewardSpender &&
        ev.amount.eq(nmxAmount)
      );
    });
  });

  it("error on expired deadline", async () => {
    const permitInfo = await defaultPermitInfo(1);
    permitInfo.deadline = 1;
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        permitInfo.value,
        permitInfo.value,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMXSTKSRV: EXPIRED"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on incorrect nonce", async () => {
    const permitInfo = await defaultPermitInfo(1);
    permitInfo.nonce++;
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        permitInfo.value,
        permitInfo.value,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMX: INVALID_SIGNATURE"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on incorrect chainId", async () => {
    const permitInfo = await defaultPermitInfo(1);
    permitInfo.chainId++;
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        permitInfo.value,
        permitInfo.value,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMX: INVALID_SIGNATURE"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on incorrect verifyingContract address", async () => {
    const permitInfo = await defaultPermitInfo(1);
    permitInfo.verifyingContract = accounts[0];
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        permitInfo.value,
        permitInfo.value,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMX: INVALID_SIGNATURE"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on wrong signature", async () => {
    const permitInfo = await defaultPermitInfo(1);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(permitInfo.owner, typedData);
    sign.v = sign.v >= 99 ? sign.v - 1 : sign.v + 1;

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        permitInfo.value,
        permitInfo.value,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMX: INVALID_SIGNATURE"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("error on wrong signer", async () => {
    const permitInfo = await defaultPermitInfo(1);
    const typedData = createPermitMessageData(permitInfo);
    const sign = await signData(accounts[1], typedData);

    try {
      await stakingService.claimWithAuthorization(
        permitInfo.owner,
        permitInfo.value,
        permitInfo.value,
        permitInfo.deadline,
        sign.v,
        sign.r,
        sign.s,
        { from: permitInfo.spender }
      );
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMX: INVALID_SIGNATURE"),
        `Unexpected error message: ${e.message}`
      );
    }
  });
});

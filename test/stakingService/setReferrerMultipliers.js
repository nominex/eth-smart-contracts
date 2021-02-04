const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const StakingService = artifacts.require("StakingService");
const { rpcCommand } = require("../utils.js");

contract("StakingService#setReferrerMultipliers", (accounts) => {
  let stakingService;
  let snapshotId;

  before(async () => {
    let nmx = await MockedNmxToken.new();
    let stakingToken = await MockedStakingToken.new();
    stakingService = await StakingService.new(
      nmx.address,
      stakingToken.address,
      nmx.address
    );
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

  it("check default value", async () => {
    await assertReferrerMultipliers([
      { stakedAmountInUsdt: 100, multiplier: 500 },
      { stakedAmountInUsdt: 300, multiplier: 1000 },
      { stakedAmountInUsdt: 1000, multiplier: 1500 },
      { stakedAmountInUsdt: 3000, multiplier: 2000 },
      { stakedAmountInUsdt: 10000, multiplier: 2500 },
    ]);
  });

  it("values stored", async () => {
    await setReferrerMultipliersAndVerify([
      { stakedAmountInUsdt: 1, multiplier: 23 },
      { stakedAmountInUsdt: 4, multiplier: 56 },
      { stakedAmountInUsdt: 7, multiplier: 89 },
    ]);
  });

  it("cleared values", async () => {
    await stakingService.setReferrerMultipliers([
      { stakedAmountInUsdt: 1, multiplier: 23 },
      { stakedAmountInUsdt: 4, multiplier: 56 },
      { stakedAmountInUsdt: 7, multiplier: 89 },
    ]);
    await setReferrerMultipliersAndVerify([]);
  });

  it("length decreased", async () => {
    await stakingService.setReferrerMultipliers([
      { stakedAmountInUsdt: 1, multiplier: 23 },
      { stakedAmountInUsdt: 4, multiplier: 56 },
      { stakedAmountInUsdt: 7, multiplier: 89 },
    ]);
    await setReferrerMultipliersAndVerify([
      { stakedAmountInUsdt: 55, multiplier: 6677 },
    ]);
  });

  it("length increased", async () => {
    await stakingService.setReferrerMultipliers([
      { stakedAmountInUsdt: 55, multiplier: 6677 },
    ]);
    await setReferrerMultipliersAndVerify([
      { stakedAmountInUsdt: 1, multiplier: 23 },
      { stakedAmountInUsdt: 4, multiplier: 56 },
      { stakedAmountInUsdt: 7, multiplier: 89 },
    ]);
  });

  it("available when StakingService paused", async () => {
    await stakingService.pause();
    await stakingService.setReferrerMultipliers([
      { stakedAmountInUsdt: 1, multiplier: 23 },
      { stakedAmountInUsdt: 4, multiplier: 56 },
      { stakedAmountInUsdt: 7, multiplier: 89 },
    ]);
  });

  it("available for owner", async () => {
    await stakingService.setReferrerMultipliers([], { from: accounts[0] });
  });

  it("not available for not owner", async () => {
    try {
      await stakingService.setReferrerMultipliers([], { from: accounts[1] });
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("Ownable: caller is not the owner"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("first element can start at zero stakedAmountInUsdt", async () => {
    await setReferrerMultipliersAndVerify([
      { stakedAmountInUsdt: 0, multiplier: 12 },
      { stakedAmountInUsdt: 10, multiplier: 9999 },
    ]);
  });

  it("first element can start at greater than zero stakedAmountInUsdt", async () => {
    await stakingService.setReferrerMultipliers([
      { stakedAmountInUsdt: 5, multiplier: 12 },
      { stakedAmountInUsdt: 10, multiplier: 9999 },
    ]);
  });

  it("the same stakedAmountInUsdt two times in a row", async () => {
    try {
      await stakingService.setReferrerMultipliers([
        { stakedAmountInUsdt: 5, multiplier: 12 },
        { stakedAmountInUsdt: 5, multiplier: 9999 },
      ]);
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NmxStakingService: INVALID_ORDER"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("stakedAmountInUsdt is less than the previous value", async () => {
    try {
      await stakingService.setReferrerMultipliers([
        { stakedAmountInUsdt: 5, multiplier: 1011 },
        { stakedAmountInUsdt: 7, multiplier: 1213 },
        { stakedAmountInUsdt: 6, multiplier: 1415 },
        { stakedAmountInUsdt: 8, multiplier: 1617 },
      ]);
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NmxStakingService: INVALID_ORDER"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  async function setReferrerMultipliersAndVerify(newMultipliersArray) {
    await stakingService.setReferrerMultipliers(newMultipliersArray);
    await assertReferrerMultipliers(newMultipliersArray);
  }

  async function assertReferrerMultipliers(expectedMultipliersArray) {
    for (let i = 0; i < expectedMultipliersArray.length; i++) {
      let expected = expectedMultipliersArray[i];
      let actual = await stakingService.referrerMultipliers(i);
      assert.equal(
        actual.stakedAmountInUsdt.toString(),
        expected.stakedAmountInUsdt.toString(),
        `${i} item stakedAmountInUsdt`
      );
      assert.equal(
        actual.multiplier.toString(),
        expected.multiplier.toString(),
        `${i} item multiplier`
      );
    }

    let error = null;
    try {
      await stakingService.referrerMultipliers(expectedMultipliersArray.length);
    } catch (e) {
      error = e;
    }
    assert.isNotNull(
      error,
      "referrerMultipliers length is longer than expected"
    );
  }
});

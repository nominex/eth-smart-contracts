const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const MockedNmxToken = artifacts.require("MockedNmxToken");
const StakingService = artifacts.require("StakingService");
const { rpcCommand } = require("../utils.js");

contract("StakingService#setReferralMultiplier", (accounts) => {
  let stakingService;
  let snapshotId;

  before(async () => {
    let nmx = await MockedNmxToken.new();
    let usdtToken = await MockedUsdtToken.new();
    let stakingToken = await MockedStakingToken.new(usdtToken.address);
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
    await assertReferralMultiplier(500);
  });

  it("values stored", async () => {
    await setReferralMultiplierAndVerify(5);
  });

  it("cleared values", async () => {
    await stakingService.setReferralMultiplier(6);
    await setReferralMultiplierAndVerify(0);
  });

  it("available when StakingService paused", async () => {
    await stakingService.pause();
    await stakingService.setReferralMultiplier(7);
  });

  it("available for owner", async () => {
    await stakingService.setReferralMultiplier(0, { from: accounts[0] });
  });

  it("not available for not owner", async () => {
    try {
      await stakingService.setReferralMultiplier(0, { from: accounts[1] });
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("Ownable: caller is not the owner"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  async function setReferralMultiplierAndVerify(newMultiplier) {
    await stakingService.setReferralMultiplier(newMultiplier);
    await assertReferralMultiplier(newMultiplier);
  }

  async function assertReferralMultiplier(expectedMultiplier) {
    let actual = await stakingService.referralMultiplier();
    assert.equal(
      actual.toString(),
      expectedMultiplier.toString(),
      "multiplier"
    );
  }
});

const MockedNmxToken = artifacts.require("MockedNmxToken");
const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const StakingService = artifacts.require("StakingService");
const { rpcCommand, getAssertBN } = require("../utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;

contract("updateHistoricalRewardRate", (accounts) => {
  const assertBN = getAssertBN();

  let nmx;
  let stakingService;
  let snapshotId;

  before(async () => {
    nmx = await MockedNmxToken.new();
    let usdtToken = await MockedUsdtToken.new();
    let stakingToken = await MockedStakingToken.new(usdtToken.address);
    stakingService = await StakingService.new(
      nmx.address,
      stakingToken.address,
      nmx.address
    );

    await stakingToken.transfer(accounts[1], toWei(toBN(500)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: accounts[1],
    });
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

  it("owner balance increased with 0 staked amount", async () => {
    let initialHrr = (await stakingService.state()).historicalRewardRate;
    let initialBalance = await nmx.balanceOf(accounts[0]);

    await stakingService.updateHistoricalRewardRate();

    let finalHrr = (await stakingService.state()).historicalRewardRate;
    let finalBalance = await nmx.balanceOf(accounts[0]);

    assertBN(finalHrr, initialHrr);
    assertBN(finalBalance, initialBalance.add(toWei(toBN(1))));
  });

  it("no changes with 0 supplied nmx", async () => {
    await stakingService.stakeFrom(accounts[1], toWei(toBN(10)));
    await nmx.setSupply(0);

    let initialHrr = (await stakingService.state()).historicalRewardRate;
    let initialBalance = await nmx.balanceOf(accounts[0]);

    await stakingService.updateHistoricalRewardRate();

    let finalHrr = (await stakingService.state()).historicalRewardRate;
    let finalBalance = await nmx.balanceOf(accounts[0]);

    assertBN(finalHrr, initialHrr);
    assertBN(finalBalance, initialBalance);
  });

  it("historicalRewardRate increased with staked amount gt 0", async () => {
    await stakingService.stakeFrom(accounts[1], toWei(toBN(10)));

    let initialHrr = (await stakingService.state()).historicalRewardRate;
    let initialBalance = await nmx.balanceOf(accounts[0]);

    await stakingService.updateHistoricalRewardRate();

    let finalHrr = (await stakingService.state()).historicalRewardRate;
    let finalBalance = await nmx.balanceOf(accounts[0]);

    assert(finalHrr.gt(initialHrr));
    assertBN(finalBalance, initialBalance);
  });
});

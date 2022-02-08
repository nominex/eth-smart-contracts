const Nmx = artifacts.require("Nmx");
const MockedStakingToken = artifacts.require("MockedStakingToken");
const MockedUsdtToken = artifacts.require("MockedUsdtToken");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService2 = artifacts.require("StakingService2");
const { rpcCommand, getAssertBN } = require("../utils.js");
const truffleAssert = require("truffle-assertions");
const { step } = require("mocha-steps");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

contract("StakingService2; Group: claimRewardPause", (accounts) => {
  const assertBN = getAssertBN(0);

  let nmx;
  let stakingToken;
  let stakingService;
  let snapshotId;
  let stakingRouter;

  let errorMessage = "";
  let tx = null;

  before(async () => {
    nmx = await Nmx.deployed();

    let usdtToken = await MockedUsdtToken.new();
    stakingToken = await MockedStakingToken.new(usdtToken.address);

    stakingRouter = await StakingRouter.new(nmx.address);
    nmx.transferPoolOwnership(1, stakingRouter.address);

    stakingService = await StakingService2.new(
      nmx.address,
      stakingToken.address,
      stakingRouter.address
    );
    stakingRouter.changeStakingServiceShares(
      new Array(stakingService.address),
      new Array(1).fill(1)
    );

    await stakingToken.transfer(accounts[1], toWei(toBN(1000)));
    await stakingToken.approve(stakingService.address, toWei(toBN(500)), {
      from: accounts[1],
    });
    await stakingToken.transfer(accounts[3], toWei(toBN(100)));
    await stakingToken.approve(stakingService.address, toWei(toBN(50)), {
      from: accounts[3],
    });
    await stakingToken.transfer(accounts[4], toWei(toBN(50)));
    await stakingToken.approve(stakingService.address, toWei(toBN(100)), {
      from: accounts[4],
    });
  });

  function makeSuite(name, tests) {
    describe(`Test: ${name}`, function () {
      before(async () => {
        // snaphot must be taken before each test because of the issue in ganache
        // evm_revert also deletes the saved snapshot
        // https://github.com/trufflesuite/ganache-cli/issues/138
        snapshotId = await rpcCommand("evm_snapshot");
        //await verifyStakedAmount(0); TODO
      });
      tests();
      after(async () => {
        await rpcCommand("evm_revert", [snapshotId]);
        errorMessage = "";
        tx = null;
      });
    });
  }

  makeSuite("User can stake and unstake and claim reward when claim reward is not paused", () => {
    stake(10, accounts[1]);
    errorNotOccurred();
    stakeFrom(10, accounts[3], accounts[1]);
    errorNotOccurred();
    claimReward(accounts[1]);
    errorNotOccurred();
    claimRewardToWithoutUpdate(accounts[0], accounts[1]);
    errorNotOccurred();
    claimRewardToWithoutUpdate(accounts[0], accounts[1]);
    errorNotOccurred();
    unstake(10, accounts[1]);
    errorNotOccurred();
    unstakeTo(10, accounts[0], accounts[1]);
  });


  makeSuite("User can stake and unstake when claim reward paused", () => {
    setClaimRewardPaused(true);
      stake(10, accounts[1]);
      errorNotOccurred();
      stakeFrom(10, accounts[3], accounts[1]);
      errorNotOccurred();
      unstake(10, accounts[1]);
      errorNotOccurred();
      unstakeTo(10, accounts[0], accounts[1]);
  });


  makeSuite("User can not claim reward when claim reward paused", () => {
    setClaimRewardPaused(true);
    stake(10, accounts[1]);
    claimReward(accounts[1]);
    checkErrorOccurred("NmxStakingService: CLAIM_REWARD_PAUSED");
    claimRewardTo(accounts[0], accounts[1]);
    checkErrorOccurred("NmxStakingService: CLAIM_REWARD_PAUSED");
    claimRewardToWithoutUpdate(accounts[0], accounts[1]);
    checkErrorOccurred("NmxStakingService: CLAIM_REWARD_PAUSED");
  });

  makeSuite("User can not claim reward when claim reward unpaused", () => {
    setClaimRewardPaused(true);
    stake(10, accounts[1]);
    setClaimRewardPaused(false);
    claimReward(accounts[1]);
    errorNotOccurred();
    claimRewardToWithoutUpdate(accounts[0], accounts[1]);
    errorNotOccurred();
    claimRewardToWithoutUpdate(accounts[0], accounts[1]);
    errorNotOccurred();
  });

  function stake(amountToStake, fromAddress) {
    step(`Stake ${amountToStake} from ${fromAddress}`, async () => {
      try {
        tx = await stakingService.stake(toWei(toBN(amountToStake)), {
          from: fromAddress,
        });
      } catch (error) {
        tx = null;
        errorMessage = error.message;
      }
    });
  }

  function stakeFrom(amountToStake, ownerAddress, fromAddress) {
    step(
      `StakeFrom ${amountToStake} for ${ownerAddress} from ${fromAddress}`,
      async () => {
        try {
          tx = await stakingService.stakeFrom(
            ownerAddress,
            toWei(toBN(amountToStake)),
            { from: fromAddress }
          );
        } catch (error) {
          tx = null;
          errorMessage = error.message;
        }
      }
    );
  }

  function unstake(amountToUnstake, fromAddress) {
    step(`Unstake ${amountToUnstake} from ${fromAddress}`, async () => {
      try {
        tx = await stakingService.unstake(toWei(toBN(amountToUnstake)), {
          from: fromAddress,
        });
      } catch (error) {
        tx = null;
        errorMessage = error.message;
      }
    });
  }

  function unstakeTo(amountToUnstake, toAddress, fromAddress) {
    step(
      `UnstakeTo ${amountToUnstake} to ${toAddress} from ${fromAddress}`,
      async () => {
        try {
          tx = await stakingService.unstakeTo(
            toAddress,
            toWei(toBN(amountToUnstake)),
            { from: fromAddress }
          );
        } catch (error) {
          tx = null;
          errorMessage = error.message;
        }
      }
    );
  }

  function claimReward(fromAddress) {
    step(`claimReward from ${fromAddress}`, async () => {
      try {
        tx = await stakingService.claimReward({
          from: fromAddress,
        });
      } catch (error) {
        tx = null;
        errorMessage = error.message;
      }
    });
  }

  function claimRewardTo(destination, fromAddress) {
    step(`claimRewardTo ${destination} from ${fromAddress}`, async () => {
      try {
        tx = await stakingService.claimRewardTo(destination, {
          from: fromAddress,
        });
      } catch (error) {
        tx = null;
        errorMessage = error.message;
      }
    });
  }

  function claimRewardToWithoutUpdate(destination, fromAddress) {
      step(`claimRewardToWithoutUpdate ${destination} from ${fromAddress}`, async () => {
          try {
              tx = await stakingService.claimRewardToWithoutUpdate(destination, {
                  from: fromAddress,
              });
          } catch (error) {
              tx = null;
              errorMessage = error.message;
          }
      });
  }

  function checkErrorOccurred(expectedMessage) {
    step(
      `Check that error occurred with message "${expectedMessage}"`,
      async () => {
        await assert(errorMessage.includes(expectedMessage), errorMessage);
      }
    );
  }

  function errorNotOccurred() {
    step(`Check that error not occurred`, async () => {
      await assert.equal("", errorMessage);
    });
  }

  function checkStakedEventEmitted(staker, amount) {
    step(
      `Check "Staked" event emitted with params: owner=${staker}, amount=${amount}`,
      async () => {
        truffleAssert.eventEmitted(tx, "Staked", (ev) => {
          return (
            ev.owner === staker && fromWei(ev.amount) === amount.toString()
          );
        });
      }
    );
  }

  function checkStakingEventNotEmitted(eventName) {
    step(`Check "${eventName}" event not emitted`, async () => {
      if (tx === null) {
        return;
      }
      truffleAssert.eventNotEmitted(tx, eventName);
    });
  }

  function checkUnstakedEventEmitted(staker, to, amount) {
    step(
      `Check "Unstaked" event emitted with params: from=${staker}, to=${to}, amount=${amount}`,
      async () => {
        truffleAssert.eventEmitted(tx, "Unstaked", (ev) => {
          return (
            ev.from === staker &&
            ev.to === to &&
            fromWei(ev.amount) === amount.toString()
          );
        });
      }
    );
  }

  function verifyUserBalanceAndStakedAmount(address, balance, stakedAmount) {
    verifyUserBalance(address, balance);
    verifyUserStakedAmount(address, stakedAmount);
  }

  function verifyUserBalance(address, balance) {
    step(`User "${address}" balance is "${balance}"`, async () => {
      assertBN(
        await stakingToken.balanceOf(address),
        toWei(toBN(balance)),
        "user balance"
      );
    });
  }

  function verifyUserStakedAmount(address, stakedAmount) {
    step(`User "${address}" staked amount is "${stakedAmount}"`, async () => {
      assertBN(
        (await stakingService.stakers(address)).amount,
        stakedAmount,
        "stakedAmount"
      );
    });
  }

  function verifyStakingServiceBalanceAndTotalStaked(totalStaked) {
    verifyStakingServiceBalance(totalStaked);
    verifyTotalStaked(totalStaked);
  }

  function verifyStakingServiceBalance(balance) {
    step(`StakingService balance is "${balance}"`, async () => {
      assertBN(
        await stakingToken.balanceOf(stakingService.address),
        balance,
        "stakingService balance"
      );
    });
  }

  function verifyTotalStaked(totalStaked) {
    step(`StakingService totalStaked is "${totalStaked}"`, async () => {
      assertBN(
        (await stakingService.state()).totalStaked,
        totalStaked,
        "totalStaked"
      );
    });
  }

  function pauseStakingService() {
    step(`Pause StakingService"`, async () => {
      await stakingService.pause();
    });
  }

  function unpauseStakingService() {
    step(`Unpause StakingService"`, async () => {
      await stakingService.unpause();
    });
  }

  function setClaimRewardPaused(val) {
    step(`Pause StakingService ${val}`, async () => {
      await stakingService.setClaimRewardPaused(val);
    });
  }

});

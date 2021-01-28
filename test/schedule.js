const MintSchedule = artifacts.require("MintSchedule");
const Nmx = artifacts.require("Nmx");
const { getAssertBN } = require("./utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;

const DAY = 24 * 60 * 60;

const MINT_POOL_DEFAULT_VALUE = 0;
const MINT_POOL_PRIMARY = 1;
const MINT_POOL_BONUS = 2;
const MINT_POOL_TEAM = 3;
const MINT_POOL_NOMINEX = 4;

contract("MintSchedule", (accounts) => {
  let assertBN = getAssertBN(10);

  let mintSchedule;
  let now = Math.floor(new Date().getTime() / 1000);

  before(async () => {
    mintSchedule = await MintSchedule.deployed();
  });

  it("time is before state.time", async () => {
    let state = {
      time: now,
      itemIndex: 4,
      weekIndex: 4,
      weekStartTime: now - 222,
      nextTickSupply: 1000000,
    };

    await test(state, state.time - 1, MINT_POOL_PRIMARY, 0);
  });

  it("time is equal to state.time", async () => {
    let state = {
      time: now,
      itemIndex: 4,
      weekIndex: 4,
      weekStartTime: now - 222,
      nextTickSupply: 1000000,
    };

    await test(state, state.time, MINT_POOL_BONUS, 0);
  });

  it("first second", async () => {
    let state = {
      time: now,
      itemIndex: 0,
      weekIndex: 0,
      weekStartTime: now,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.8 * 0.9);
    await test(state, state.time + 1, MINT_POOL_PRIMARY, expectedNmxSupply, {
      time: state.time + 1,
    });
  });

  it("last second", async () => {
    let state = {
      time: now,
      itemIndex: 10,
      weekIndex: 2083,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.7 * 0.3);
    let expectedState = {
      time: state.time + 1,
      itemIndex: 11,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.99995),
    };
    await test(
      state,
      state.time + 1,
      MINT_POOL_TEAM,
      expectedNmxSupply,
      expectedState
    );
  });

  it("after ending", async () => {
    let state = {
      time: now,
      itemIndex: 11,
      weekIndex: 0,
      weekStartTime: now,
      nextTickSupply: 1000000,
    };

    await test(state, state.time + 1, MINT_POOL_TEAM, 0);
    await test(state, state.time + 2, MINT_POOL_TEAM, 0);
    await test(state, state.time + DAY * 7 + 3, MINT_POOL_TEAM, 0);
  });

  it("nmxSupply in 1 sec for all pools", async () => {
    let state = {
      time: now,
      itemIndex: 2,
      weekIndex: 3,
      weekStartTime: now - 100,
      nextTickSupply: 1000000,
    };

    let newTime = state.time + 1;
    let defaultPoolValueExpectedNmxSupply = state.nextTickSupply * 0;
    let primaryPoolExpectedNmxSupply = Math.floor(
      state.nextTickSupply * 0.7 * 0.7 * 0.8
    );
    let bonusPoolExpectedNmxSupply = Math.floor(
      state.nextTickSupply * 0.7 * 0.7 * 0.2
    );
    let teamPoolExpectedNmxSupply = Math.floor(
      state.nextTickSupply * 0.7 * 0.3
    );
    let nominexPoolExpectedNmxSupply = Math.floor(state.nextTickSupply * 0.3);

    await test(
      state,
      newTime,
      MINT_POOL_DEFAULT_VALUE,
      defaultPoolValueExpectedNmxSupply,
      { time: newTime }
    );
    await test(
      state,
      newTime,
      MINT_POOL_PRIMARY,
      primaryPoolExpectedNmxSupply,
      { time: newTime }
    );
    await test(state, newTime, MINT_POOL_BONUS, bonusPoolExpectedNmxSupply, {
      time: newTime,
    });
    await test(state, newTime, MINT_POOL_TEAM, teamPoolExpectedNmxSupply, {
      time: newTime,
    });
    await test(
      state,
      newTime,
      MINT_POOL_NOMINEX,
      nominexPoolExpectedNmxSupply,
      { time: newTime }
    );
  });

  it("nmxSupply in several seconds", async () => {
    let state = {
      time: now,
      itemIndex: 5,
      weekIndex: 12,
      weekStartTime: now - 50,
      nextTickSupply: 1000000,
    };

    let oneSecExpectedNmxSupply = Math.floor(state.nextTickSupply * 0.3);

    await test(
      state,
      state.time + 1,
      MINT_POOL_NOMINEX,
      oneSecExpectedNmxSupply * 1,
      { time: state.time + 1 }
    );
    await test(
      state,
      state.time + 2,
      MINT_POOL_NOMINEX,
      oneSecExpectedNmxSupply * 2,
      { time: state.time + 2 }
    );
    await test(
      state,
      state.time + 3,
      MINT_POOL_NOMINEX,
      oneSecExpectedNmxSupply * 3,
      { time: state.time + 3 }
    );
    await test(
      state,
      state.time + 5,
      MINT_POOL_NOMINEX,
      oneSecExpectedNmxSupply * 5,
      { time: state.time + 5 }
    );
    await test(
      state,
      state.time + 10,
      MINT_POOL_NOMINEX,
      oneSecExpectedNmxSupply * 10,
      { time: state.time + 10 }
    );
  });

  it("week change in 1 second", async () => {
    let state = {
      time: now,
      itemIndex: 0,
      weekIndex: 0,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.8 * 0.1);
    let expectedState = {
      time: state.time + 1,
      weekIndex: 1,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.994),
    };
    await test(
      state,
      state.time + 1,
      MINT_POOL_BONUS,
      expectedNmxSupply,
      expectedState
    );
  });

  it("week change in several seconds", async () => {
    let state = {
      time: now,
      itemIndex: 0,
      weekIndex: 0,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let oldCycleOneSecNmxSupply = Math.floor(state.nextTickSupply * 0.8 * 0.1);
    let newCycleOneSecNmxSupply = Math.floor(
      state.nextTickSupply * 0.994 * 0.8 * 0.1
    );
    let expectedNmxSupply =
      oldCycleOneSecNmxSupply * 1 + newCycleOneSecNmxSupply * 2;
    let expectedState = {
      time: state.time + 3,
      weekIndex: 1,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.994),
    };
    await test(
      state,
      state.time + 3,
      MINT_POOL_BONUS,
      expectedNmxSupply,
      expectedState
    );
  });

  it("changing two weeks at a time", async () => {
    let state = {
      time: now,
      itemIndex: 0,
      weekIndex: 1,
      weekStartTime: now - DAY * 7 + 2,
      nextTickSupply: 1000000,
    };

    let firstCycleNextTickSupply = Math.floor(state.nextTickSupply);
    let secondCycleNextTickSupply = Math.floor(state.nextTickSupply * 0.994);
    let thirdCycleNextTickSupply = Math.floor(
      state.nextTickSupply * 0.994 * 0.994
    );

    let firstCycleOneSecNmxSupply = Math.floor(
      firstCycleNextTickSupply * 0.8 * 0.9
    );
    let secondCycleOneSecNmxSupply = Math.floor(
      secondCycleNextTickSupply * 0.8 * 0.9
    );
    let thirdCycleOneSecNmxSupply = Math.floor(
      thirdCycleNextTickSupply * 0.8 * 0.9
    );

    let expectedNmxSupply = 0;
    expectedNmxSupply += firstCycleOneSecNmxSupply * 2;
    expectedNmxSupply += secondCycleOneSecNmxSupply * DAY * 7;
    expectedNmxSupply += thirdCycleOneSecNmxSupply * 3;
    let expectedState = {
      time: state.time + DAY * 7 + 5,
      weekIndex: 3,
      weekStartTime: state.time + DAY * 7 + 2,
      nextTickSupply: thirdCycleNextTickSupply,
    };
    let oldAssertBN = assertBN;
    try {
      // accumulation of rounding error over several cycles
      assertBN = getAssertBN(1000000);
      await test(
        state,
        state.time + DAY * 7 + 5,
        MINT_POOL_PRIMARY,
        expectedNmxSupply,
        expectedState
      );
    } finally {
      assertBN = oldAssertBN;
    }
  });

  it("item change in 1 second", async () => {
    let state = {
      time: now,
      itemIndex: 2,
      weekIndex: 17,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.3);
    let expectedState = {
      time: state.time + 1,
      itemIndex: 3,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.994),
    };
    await test(
      state,
      state.time + 1,
      MINT_POOL_NOMINEX,
      expectedNmxSupply,
      expectedState
    );
  });

  it("item change in several seconds", async () => {
    let state = {
      time: now,
      itemIndex: 2,
      weekIndex: 17,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let oldCycleOneSecNmxSupply = Math.floor(state.nextTickSupply * 0.3);
    let newCycleOneSecNmxSupply = Math.floor(
      state.nextTickSupply * 0.994 * 0.3
    );
    let expectedNmxSupply =
      oldCycleOneSecNmxSupply * 1 + newCycleOneSecNmxSupply * 2;
    let expectedState = {
      time: state.time + 3,
      itemIndex: 3,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.994),
    };
    await test(
      state,
      state.time + 3,
      MINT_POOL_NOMINEX,
      expectedNmxSupply,
      expectedState
    );
  });

  it("different outputRate", async () => {
    let state = {
      time: now,
      itemIndex: 8,
      weekIndex: 555,
      weekStartTime: now - 50,
      nextTickSupply: 1000000,
    };

    let oneSecExpectedNmxSupply = state.nextTickSupply * 0.7 * 0.7 * 0.2;
    let oneSecExpectedNmxSupply05 = Math.floor(oneSecExpectedNmxSupply * 0.5);
    let oneSecExpectedNmxSupply01 = Math.floor(oneSecExpectedNmxSupply * 0.1);
    let oneSecExpectedNmxSupply0 = oneSecExpectedNmxSupply * 0;
    let oneSecExpectedNmxSupply1 = Math.floor(oneSecExpectedNmxSupply * 1);

    await mintSchedule.setOutputRate((5n << 64n) / 10n); // 0.5
    await test(
      state,
      state.time + 1,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply05 * 1,
      { time: state.time + 1 }
    );
    await test(
      state,
      state.time + 2,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply05 * 2,
      { time: state.time + 2 }
    );

    await mintSchedule.setOutputRate((1n << 64n) / 10n); // 0.1
    await test(
      state,
      state.time + 1,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply01 * 1,
      { time: state.time + 1 }
    );
    await test(
      state,
      state.time + 3,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply01 * 3,
      { time: state.time + 3 }
    );

    await mintSchedule.setOutputRate(0);
    await test(
      state,
      state.time + 1,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply0 * 1,
      { time: state.time + 1 }
    );
    await test(
      state,
      state.time + 4,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply0 * 4,
      { time: state.time + 4 }
    );

    await mintSchedule.setOutputRate(1n << 64n);
    await test(
      state,
      state.time + 1,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply1 * 1,
      { time: state.time + 1 }
    );
    await test(
      state,
      state.time + 5,
      MINT_POOL_BONUS,
      oneSecExpectedNmxSupply1 * 5,
      { time: state.time + 5 }
    );
  });

  it("outputRate must be ge 0", async () => {
    try {
      await mintSchedule.setOutputRate((-5n << 64n) / 10n); // -0.5
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("NMXMINTSCH: outputRate must be ge 0"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("outputRate must be le 1<<64", async () => {
    try {
      await mintSchedule.setOutputRate((1n << 64n) + (5n << 64n) / 10n); // 1.5
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("outputRate must be le 1<<64"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("outputRate can not be called by not the owner", async () => {
    try {
      await mintSchedule.setOutputRate((5n << 64n) / 10n, {
        from: accounts[1],
      }); // 0.5
      assert.fail("Error not occurred");
    } catch (e) {
      assert(
        e.message.includes("Ownable: caller is not the owner"),
        `Unexpected error message: ${e.message}`
      );
    }
  });

  it("outputRate can be called by the owner", async () => {
    await mintSchedule.setOutputRate((5n << 64n) / 10n, { from: accounts[0] }); // 0.5
  });

  async function test(
    state,
    timestamp,
    mintPool,
    expectedNmxSupply,
    expectedState
  ) {
    let result = await mintSchedule.makeProgress(state, timestamp, mintPool);

    assertBN(result[0], toBN(expectedNmxSupply), "nmxSupply");

    expectedState = { ...state, ...expectedState };
    assert.equal(result[1].time, expectedState.time, "state.time");
    assert.equal(
      result[1].itemIndex,
      expectedState.itemIndex,
      "state.itemIndex"
    );
    assert.equal(
      result[1].weekIndex,
      expectedState.weekIndex,
      "state.weekIndex"
    );
    assert.equal(
      result[1].weekStartTime,
      expectedState.weekStartTime,
      "state.weekStartTime"
    );
    assertBN(
      toBN(result[1].nextTickSupply),
      toBN(expectedState.nextTickSupply),
      "state.nextTickSupply"
    );

    return result;
  }
});

contract("MintSchedule#totalSupply", (accounts) => {
  let nmx;
  let mintSchedule;

  before(async () => {
    nmx = await Nmx.deployed();
    mintSchedule = await MintSchedule.deployed();
  });

  xit("total supplied NMX less than 200kk", async () => {
    let now = Math.floor(new Date().getTime() / 1000);
    let state = {
      time: now,
      itemIndex: 0,
      weekIndex: 0,
      weekStartTime: now,
      nextTickSupply: (10000 * 10 ** 18) / DAY + "",
    };

    let totalSupply = toBN(0);

    for (let i = 0; i < 102; i++) {
      let newTime = state.time + DAY * 365;
      let result0 = await mintSchedule.makeProgress(
        state,
        newTime,
        MINT_POOL_DEFAULT_VALUE
      );
      let result1 = await mintSchedule.makeProgress(
        state,
        newTime,
        MINT_POOL_PRIMARY
      );
      let result2 = await mintSchedule.makeProgress(
        state,
        newTime,
        MINT_POOL_BONUS
      );
      let result3 = await mintSchedule.makeProgress(
        state,
        newTime,
        MINT_POOL_TEAM
      );
      let result4 = await mintSchedule.makeProgress(
        state,
        newTime,
        MINT_POOL_NOMINEX
      );

      let oneYearSupply = result0[0]
        .add(result1[0])
        .add(result2[0])
        .add(result3[0])
        .add(result4[0]);
      totalSupply = totalSupply.add(oneYearSupply);

      state.time = parseInt(result0[1].time);
      state.itemIndex = result0[1].itemIndex;
      state.weekIndex = result0[1].weekIndex;
      state.weekStartTime = result0[1].weekStartTime;
      state.nextTickSupply = result0[1].nextTickSupply;

      if (i === 101) {
        assert(
          oneYearSupply.isZero(),
          "supply for 102 year = " + oneYearSupply
        );
      }
    }

    let alreadyMintedNmx = await nmx.balanceOf(accounts[0]);
    let totalSupplyWithMinted = totalSupply.add(alreadyMintedNmx);
    console.log(`Total Nmx supply: ${totalSupplyWithMinted}`);
    assert(
      totalSupplyWithMinted.lte(toWei(toBN(200000000))),
      `total NMX supply = ${totalSupplyWithMinted}`
    );
  });
});

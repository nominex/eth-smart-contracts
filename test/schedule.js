const MintSchedule = artifacts.require("MintSchedule");
const Nmx = artifacts.require("Nmx");
const { getAssertBN } = require("./utils.js");

const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

const DAY = 24 * 60 * 60;

const MINT_POOL_DEFAULT_VALUE = 0;
const MINT_POOL_PRIMARY = 1;
const MINT_POOL_NOMINEX = 2;

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

    await test(state, state.time, MINT_POOL_NOMINEX, 0);
  });

  it("first second", async () => {
    let state = {
      time: now,
      itemIndex: 0,
      weekIndex: 0,
      weekStartTime: now,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.625);
    await test(state, state.time + 1, MINT_POOL_PRIMARY, expectedNmxSupply, {
      time: state.time + 1,
    });
  });

  it("last second", async () => {
    let state = {
      time: now,
      itemIndex: 21,
      weekIndex: 501,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.5);
    let expectedState = {
      time: state.time + 1,
      itemIndex: 22,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.99995),
    };
    await test(
      state,
      state.time + 1,
      MINT_POOL_NOMINEX,
      expectedNmxSupply,
      expectedState
    );
  });

  it("after ending", async () => {
    let state = {
      time: now,
      itemIndex: 22,
      weekIndex: 0,
      weekStartTime: now,
      nextTickSupply: 1000000,
    };

    await test(state, state.time + 1, MINT_POOL_NOMINEX, 0);
    await test(state, state.time + 2, MINT_POOL_NOMINEX, 0);
    await test(state, state.time + DAY * 7 + 3, MINT_POOL_NOMINEX, 0);
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
      state.nextTickSupply * 0.625
    );
    let nominexPoolExpectedNmxSupply = Math.floor(
      state.nextTickSupply * 0.375
    );

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
    await test(state, newTime, MINT_POOL_NOMINEX, nominexPoolExpectedNmxSupply, {
      time: newTime,
    });
  });

  it("nmxSupply in several seconds", async () => {
    let state = {
      time: now,
      itemIndex: 5,
      weekIndex: 12,
      weekStartTime: now - 50,
      nextTickSupply: 1000000,
    };

    let oneSecExpectedNmxSupply = Math.floor(state.nextTickSupply * 0.5);

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

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.375);
    let expectedState = {
      time: state.time + 1,
      itemIndex: 1,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.75),
    };
    await test(
      state,
      state.time + 1,
      MINT_POOL_NOMINEX,
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

    let oldCycleOneSecNmxSupply = Math.floor(state.nextTickSupply * 0.375);
    let newCycleOneSecNmxSupply = Math.floor(
      state.nextTickSupply * 0.75 * 0.375
    );
    let expectedNmxSupply =
      oldCycleOneSecNmxSupply * 1 + newCycleOneSecNmxSupply * 2;
    let expectedState = {
      time: state.time + 3,
      itemIndex: 1,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 0.75),
    };
    await test(
      state,
      state.time + 3,
      MINT_POOL_NOMINEX,
      expectedNmxSupply,
      expectedState
    );
  });

  it("changing two weeks at a time", async () => {
    let state = {
      time: now,
      itemIndex: 1,
      weekIndex: 0,
      weekStartTime: now - DAY * 7 + 2,
      nextTickSupply: 1000000,
    };

    let firstCycleNextTickSupply = Math.floor(state.nextTickSupply);
    let secondCycleNextTickSupply = Math.floor(state.nextTickSupply * 0.35);
    let thirdCycleNextTickSupply = Math.floor(
      state.nextTickSupply * 0.35 * 1.04
    );

    let firstCycleOneSecNmxSupply = Math.floor(
      firstCycleNextTickSupply * 0.625
    );
    let secondCycleOneSecNmxSupply = Math.floor(
      secondCycleNextTickSupply * 0.625
    );
    let thirdCycleOneSecNmxSupply = Math.floor(
      thirdCycleNextTickSupply * 0.625
    );

    let expectedNmxSupply = 0;
    expectedNmxSupply += firstCycleOneSecNmxSupply * 2;
    expectedNmxSupply += secondCycleOneSecNmxSupply * DAY * 7;
    expectedNmxSupply += thirdCycleOneSecNmxSupply * 3;
    let expectedState = {
      time: state.time + DAY * 7 + 5,
      itemIndex: 2,
      weekIndex: 1,
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
      itemIndex: 3,
      weekIndex: 3,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let expectedNmxSupply = Math.floor(state.nextTickSupply * 0.4375);
    let expectedState = {
      time: state.time + 1,
      itemIndex: 4,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 1.04),
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
      itemIndex: 3,
      weekIndex: 3,
      weekStartTime: now - DAY * 7 + 1,
      nextTickSupply: 1000000,
    };

    let oldCycleOneSecNmxSupply = Math.floor(state.nextTickSupply * 0.4375);
    let newCycleOneSecNmxSupply = Math.floor(
      state.nextTickSupply * 1.04 * 0.5
    );
    let expectedNmxSupply =
      oldCycleOneSecNmxSupply * 1 + newCycleOneSecNmxSupply * 2;
    let expectedState = {
      time: state.time + 3,
      itemIndex: 4,
      weekIndex: 0,
      weekStartTime: state.time + 1,
      nextTickSupply: Math.floor(state.nextTickSupply * 1.04),
    };
    await test(
      state,
      state.time + 3,
      MINT_POOL_NOMINEX,
      expectedNmxSupply,
      expectedState
    );
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
      nextTickSupply: (40000 * 10 ** 18) / DAY + "",
    };

    let totalSupply = toBN(0);

    for (let year = 1; year <= 73; year++) {
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
        MINT_POOL_NOMINEX
      );

      let oneYearSupply = result0[0]
        .add(result1[0])
        .add(result2[0]);
      totalSupply = totalSupply.add(oneYearSupply);

      state.time = parseInt(result0[1].time);
      state.itemIndex = result0[1].itemIndex;
      state.weekIndex = result0[1].weekIndex;
      state.weekStartTime = result0[1].weekStartTime;
      state.nextTickSupply = result0[1].nextTickSupply;

      console.log(`${year} year = ${fromWei(result1[0])} + ${fromWei(result2[0])} = ${fromWei(oneYearSupply)}`);
      if (year === 73) {
        assert(
          oneYearSupply.isZero(),
          "supply for 73 year = " + oneYearSupply
        );
      }
    }

    let alreadyMintedNmx = await nmx.balanceOf(accounts[0]);
    let totalSupplyWithMinted = totalSupply.add(alreadyMintedNmx);
    let limit = toWei(toBN(200000000))
    let diff = limit.isub(totalSupplyWithMinted);
    console.log(`Total Nmx supply by schedule: ${fromWei(totalSupply)}`);
    console.log(`Already Nmx minted: ${fromWei(alreadyMintedNmx)}`);
    console.log(`Total Nmx supply: ${fromWei(totalSupplyWithMinted)}`);
    console.log(`diff: ${fromWei(diff)}`);
    assert(
      totalSupplyWithMinted.lte(toWei(toBN(200000000))),
      `total NMX supply = ${totalSupplyWithMinted}`
    );
  });
});

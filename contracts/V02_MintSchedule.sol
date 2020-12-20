// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

import "./V02_Lib.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

struct MintShares {
    int128 primary;
    int128 bonus;
    int128 team;
    int128 nominex;
}

struct ScheduleItem {
    uint128 cycleDuration;
    uint128 cyclesCount;
    int128 cycleCompletenessMultiplier;
    MintShares shares;
}

struct ScheduleState {
    uint256 time;
    uint128 itemIndex;
    uint128 cycleIndex;
    uint256 cycleStartTime;
    int128 nextTickTotalSupply;
    int128 cumulativeSupply;
    int128 cumulativeSupplyBonus;
    int128 cumulativeSupplyTeam;
    int128 cumulativeSupplyNominex;
}

contract MintSchedule {
    mapping(MintPool => ScheduleState) states;

    constructor() {
        ScheduleState memory state;
        state.time = block.timestamp;
        state.cycleStartTime = block.timestamp;
        state.nextTickTotalSupply = ABDKMath64x64.div(
            10000 << 64,
            (1 days) << 64
        );

        for (uint256 poolIndex = 0; poolIndex < MintPool.length; poolIndex++) {}
    }
}

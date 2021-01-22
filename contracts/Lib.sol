// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

/**
 * @dev kinds of possible pools
 *
 * @param DEFAULT_VALUE - dummy type for null value
 * @param PRIMARY - blockchain based staking. All rules are declared in this smart contract
 * @param BONUS - Nominex platform based staking. All rules are declared and implemented in the Nominex business logic
 * @param TEAM - Nominex partner structure platform based staking. All rules are declared and implemented in the Nominex business logic
 * @param NOMINEX - tokens for Nominex company
 */
enum MintPool {DEFAULT_VALUE, PRIMARY, BONUS, TEAM, NOMINEX}

/**
 * @dev current state of the schedule for each MintPool
 *
 * @param time last invocation time
 * @param itemIndex current index in the calendar
 * @param cycleIndex current cycle index in the period
 * @param cycleStartTime start time of the current cycle
 * @param nextTickSupply how much will be distributed in the next second
 */
struct MintScheduleState {
    uint40 time;
    uint8 itemIndex;
    uint16 cycleIndex;
    uint40 cycleStartTime;
    uint128 nextTickSupply;
}

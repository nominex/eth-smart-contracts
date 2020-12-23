// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

/**
 * @dev kinds of possible pools
 *
 * DEFAULT_VALUE - dummy type for null value
 * PRIMARY - blockchain based staking. All rules are declared in this smart contract
 * BONUS - Nominex platform based staking. All rules are declared and implemented in the Nominex business logic
 * TEAM - Nominex partner structure platform based staking. All rules are declared and implemented in the Nominex business logic
 * NOMINEX - tokens for Nominex company
 */
enum MintPool {DEFAULT_VALUE, PRIMARY, BONUS, TEAM, NOMINEX}
struct MintScheduleState {
    uint256 time;
    uint8 itemIndex;
    uint96 cycleIndex;
    uint256 cycleStartTime;
    int128 nextTickSupply;
}

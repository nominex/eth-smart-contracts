// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./Lib.sol";
import "./RecoverableByOwner.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract MintSchedule is RecoverableByOwner {
    /**
     @dev structure to describe the mint schedule. After each week MintScheduleState.nextTickSupply decreases.
     When the schedule completes weekCount weeks in current item it goes to the next item in the items.
     @param weekCount duration of the item in weeks
     @param weekCompletenessMultiplier a number nextTickSupply is multiplied by after each week in the item
     @param poolShares shares of the mint pool in the item
     */
    struct ScheduleItem {
        uint16 weekCount;
        uint64 weekCompletenessMultiplier;
        uint64[] poolShares;
    }
    uint40 constant WEEK_DURATION = 7 days;

    using ABDKMath64x64 for int128;
    int128 public outputRate = ABDKMath64x64.fromInt(1); /// @dev in case it will be decided to mint Nmx in another blockchain
    ScheduleItem[] public items; /// @dev array of shcedule describing items

    constructor() {
        // used in pool shares ABDKMath64x64 consts
        int128 abdk_1_10 = ABDKMath64x64.divu(1, 10);
        int128 abdk_15_100 = ABDKMath64x64.divu(15, 100);
        int128 abdk_2_10 = ABDKMath64x64.divu(2, 10);
        int128 abdk_25_100 = ABDKMath64x64.divu(25, 100);
        int128 abdk_3_10 = ABDKMath64x64.divu(3, 10);
        int128 abdk_7_10 = ABDKMath64x64.divu(7, 10);
        int128 abdk_75_100 = ABDKMath64x64.divu(75, 100);
        int128 abdk_8_10 = ABDKMath64x64.divu(8, 10);
        int128 abdk_85_100 = ABDKMath64x64.divu(85, 100);
        int128 abdk_9_10 = ABDKMath64x64.divu(9, 10);

        // 0.0, 0.8 * 0.9, 0.8 * 0.1, 0.2, 0.0
        uint64[5] memory shares_01_28 =
            [
                0,
                uint64(abdk_8_10.mul(abdk_9_10)),
                uint64(abdk_8_10.mul(abdk_1_10)),
                uint64(abdk_2_10),
                0
            ];

        // 0.0, 0.85 * 0.75 * 0.85, 0.85 * 0.75 * 0.15, 0.85 * 0.25 , 0.15
        uint64[5] memory shares_29_56 =
            [
                0,
                uint64(abdk_85_100.mul(abdk_75_100).mul(abdk_85_100)),
                uint64(abdk_85_100.mul(abdk_75_100).mul(abdk_15_100)),
                uint64(abdk_85_100.mul(abdk_25_100)),
                uint64(abdk_15_100)
            ];

        // 0.0, 0.7 * 0.7 * 0.8, 0.7 * 0.7 * 0.2, 0.7 * 0.3, 0.30
        uint64[5] memory shares_57_xx =
            [
                0,
                uint64(abdk_7_10.mul(abdk_7_10).mul(abdk_8_10)),
                uint64(abdk_7_10.mul(abdk_7_10).mul(abdk_2_10)),
                uint64(abdk_7_10.mul(abdk_3_10)),
                uint64(abdk_3_10)
            ];

        /*1-28 first 28 days*/
        ScheduleItem storage item = items.push();
        item.weekCount = 4;
        item.weekCompletenessMultiplier = uint64(ABDKMath64x64.divu(994, 1000));
        item.poolShares = shares_01_28;

        /*29-56 second 28 days*/
        item = items.push();

        item.weekCount = 4;
        item.weekCompletenessMultiplier = uint64(ABDKMath64x64.divu(994, 1000));
        item.poolShares = shares_29_56;

        /*57-182 - 0.5 year*/
        item = items.push();

        item.weekCount = 18;
        item.weekCompletenessMultiplier = uint64(ABDKMath64x64.divu(994, 1000));
        item.poolShares = shares_57_xx;

        /*183-371 - 1 year*/
        item = items.push();

        item.weekCount = 27;
        item.weekCompletenessMultiplier = uint64(ABDKMath64x64.divu(996, 1000));
        item.poolShares = shares_57_xx;

        /*372-735 - 2 year*/
        item = items.push();

        item.weekCount = 52;
        item.weekCompletenessMultiplier = uint64(ABDKMath64x64.divu(998, 1000));
        item.poolShares = shares_57_xx;

        /*736-1463 - 4 year*/
        item = items.push();

        item.weekCount = 104;
        item.weekCompletenessMultiplier = uint64(
            ABDKMath64x64.divu(9995, 10000)
        );
        item.poolShares = shares_57_xx;

        /*1464-2926 - 8 year*/
        item = items.push();

        item.weekCount = 209;
        item.weekCompletenessMultiplier = uint64(
            ABDKMath64x64.divu(9997, 10000)
        );
        item.poolShares = shares_57_xx;

        /*2927-5481 - 15 year*/
        item = items.push();

        item.weekCount = 365;
        item.weekCompletenessMultiplier = uint64(
            ABDKMath64x64.divu(99985, 100000)
        );
        item.poolShares = shares_57_xx;

        /*5481-10962 - 30 year*/
        item = items.push();

        item.weekCount = 783;
        item.weekCompletenessMultiplier = uint64(
            ABDKMath64x64.divu(99992, 100000)
        );
        item.poolShares = shares_57_xx;

        /*10963-21917 - 60 year*/
        item = items.push();

        item.weekCount = 1565;
        item.weekCompletenessMultiplier = uint64(
            ABDKMath64x64.divu(99994, 100000)
        );
        item.poolShares = shares_57_xx;

        /*21918-36505 - 100 year*/
        item = items.push();

        item.weekCount = 2084;
        item.weekCompletenessMultiplier = uint64(
            ABDKMath64x64.divu(99995, 100000)
        );
        item.poolShares = shares_57_xx;
    }

    /// @dev the owner can decrease outputRate in case of minting some part of Nmx through another blockchain
    function setOutputRate(int128 _outputRate) external onlyOwner {
        require(
            _outputRate <= ABDKMath64x64.fromInt(1),
            "NMXMINTSCH: outputRate must be le 1<<64"
        );
        require(_outputRate >= 0, "NMXMINTSCH: outputRate must be ge 0");
        outputRate = _outputRate;
    }

    /**
     @dev calculates changes in scheduleState based on the time passed from last update and returns updated state and amount of Nmx to be minted
     */
    function makeProgress(
        MintScheduleState memory scheduleState,
        uint40 time,
        MintPool pool
    ) external view returns (uint256 nmxSupply, MintScheduleState memory) {
        if (time <= scheduleState.time) return (0, scheduleState);
        while (
            time > scheduleState.time && scheduleState.itemIndex < items.length
        ) {
            ScheduleItem storage item = items[scheduleState.itemIndex];
            uint40 boundary =
                min(time, scheduleState.weekStartTime + WEEK_DURATION);
            uint256 secondsFromLastUpdate = boundary - scheduleState.time;
            nmxSupply +=
                secondsFromLastUpdate *
                outputRate.mul(item.poolShares[uint256(pool)]).mulu(
                    uint256(scheduleState.nextTickSupply)
                );
            persistStateChange(scheduleState, item, boundary);
        }
        return (nmxSupply, scheduleState);
    }

    function persistStateChange(
        MintScheduleState memory state,
        ScheduleItem memory item,
        uint40 time
    ) private pure {
        state.time = time;
        if (time == state.weekStartTime + WEEK_DURATION) {
            state.nextTickSupply = uint128(
                int128(item.weekCompletenessMultiplier).mulu(
                    uint256(state.nextTickSupply)
                )
            );
            state.weekIndex++;
            state.weekStartTime = time;
            if (state.weekIndex == item.weekCount) {
                state.weekIndex = 0;
                state.itemIndex++;
            }
        }
    }

    function min(uint40 a, uint40 b) private pure returns (uint40) {
        if (a < b) return a;
        return b;
    }
}

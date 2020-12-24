// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./V02_Lib.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct ScheduleItem {
    uint40 cycleDuration;
    uint96 cyclesCount;
    int128 cycleCompletenessMultiplier;
    int128[] poolShares;
}

contract MintSchedule is Ownable {
    using ABDKMath64x64 for int128;
    int128 public _outputRate = ABDKMath64x64.fromInt(1);
    ScheduleItem[] public items;

    constructor() {
        uint40 sevenDays = 7 days;

        // used in shares ABDKMath64x64 consts
        int128 abdk_1_10 =
            ABDKMath64x64.fromInt(1).div(ABDKMath64x64.fromInt(10));
        int128 abdk_15_100 =
            ABDKMath64x64.fromInt(15).div(ABDKMath64x64.fromInt(100));
        int128 abdk_2_10 =
            ABDKMath64x64.fromInt(2).div(ABDKMath64x64.fromInt(10));
        int128 abdk_25_100 =
            ABDKMath64x64.fromInt(25).div(ABDKMath64x64.fromInt(100));
        int128 abdk_3_10 =
            ABDKMath64x64.fromInt(3).div(ABDKMath64x64.fromInt(10));
        int128 abdk_7_10 =
            ABDKMath64x64.fromInt(7).div(ABDKMath64x64.fromInt(10));
        int128 abdk_75_100 =
            ABDKMath64x64.fromInt(75).div(ABDKMath64x64.fromInt(100));
        int128 abdk_8_10 =
            ABDKMath64x64.fromInt(8).div(ABDKMath64x64.fromInt(10));
        int128 abdk_85_100 =
            ABDKMath64x64.fromInt(85).div(ABDKMath64x64.fromInt(100));
        int128 abdk_9_10 =
            ABDKMath64x64.fromInt(9).div(ABDKMath64x64.fromInt(10));

        // 0.0, 0.8 * 0.9, 0.8 * 0.1, 0.2, 0.0
        int128[5] memory shares_01_28 =
            [
                0,
                abdk_8_10.mul(abdk_9_10),
                abdk_8_10.mul(abdk_1_10),
                abdk_2_10,
                0
            ];

        // 0.0, 0.85 * 0.75 * 0.85, 0.85 * 0.75 * 0.15, 0.85 * 0.25 , 0.15
        int128[5] memory shares_29_56 =
            [
                0,
                abdk_85_100.mul(abdk_75_100).mul(abdk_85_100),
                abdk_85_100.mul(abdk_75_100).mul(abdk_15_100),
                abdk_85_100.mul(abdk_25_100),
                abdk_15_100
            ];

        // 0.0, 0.7 * 0.7 * 0.8, 0.7 * 0.7 * 0.2, 0.7 * 0.3, 0.30
        int128[5] memory shares_61_xx =
            [
                0,
                abdk_7_10.mul(abdk_7_10).mul(abdk_8_10),
                abdk_7_10.mul(abdk_7_10).mul(abdk_2_10),
                abdk_7_10.mul(abdk_3_10),
                abdk_3_10
            ];

        /*1-28 first 28 days*/
        ScheduleItem storage item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 4;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(994).div(
            ABDKMath64x64.fromInt(1000)
        );
        item.poolShares = shares_01_28;

        /*29-56 second 28 days*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 4;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(994).div(
            ABDKMath64x64.fromInt(1000)
        );
        item.poolShares = shares_29_56;

        /*57-182 - 0.5 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 18;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(994).div(
            ABDKMath64x64.fromInt(1000)
        );
        item.poolShares = shares_61_xx;

        /*183-371 - 1 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 27;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(996).div(
            ABDKMath64x64.fromInt(1000)
        );
        item.poolShares = shares_61_xx;

        /*372-735 - 2 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 52;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(998).div(
            ABDKMath64x64.fromInt(1000)
        );
        item.poolShares = shares_61_xx;

        /*736-1463 - 4 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 104;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(9995).div(
            ABDKMath64x64.fromInt(10000)
        );
        item.poolShares = shares_61_xx;

        /*1464-2926 - 8 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 209;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(9997).div(
            ABDKMath64x64.fromInt(10000)
        );
        item.poolShares = shares_61_xx;

        /*2927-5481 - 15 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 365;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(99985).div(
            ABDKMath64x64.fromInt(100000)
        );
        item.poolShares = shares_61_xx;

        /*5481-10962 - 30 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 783;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(99992).div(
            ABDKMath64x64.fromInt(100000)
        );
        item.poolShares = shares_61_xx;

        /*10963-21917 - 60 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 1565;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(99994).div(
            ABDKMath64x64.fromInt(100000)
        );
        item.poolShares = shares_61_xx;

        /*21917-36525 - 100 year*/
        item = items.push();
        item.cycleDuration = sevenDays;
        item.cyclesCount = 2087;
        item.cycleCompletenessMultiplier = ABDKMath64x64.fromInt(99995).div(
            ABDKMath64x64.fromInt(100000)
        );
        item.poolShares = shares_61_xx;
    }

    function setOutputRate(int128 outputRate) external onlyOwner {
        require(
            outputRate <= ABDKMath64x64.fromInt(1),
            "NMXMINTSCH: outputRate must be le 1<<64"
        );
        require(outputRate >= 0, "NMXMINTSCH: outputRate must be ge 0");
        _outputRate = outputRate;
    }

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
                min(time, scheduleState.cycleStartTime + item.cycleDuration);
            uint256 secondsFromLastUpdate = boundary - scheduleState.time;
            nmxSupply +=
                secondsFromLastUpdate *
                uint256(
                    _outputRate.mul(item.poolShares[uint256(pool)]).mul(
                        scheduleState.nextTickSupply
                    )
                );
            persistStateChange(scheduleState, item, boundary);
        }
        return (nmxSupply >> 64, scheduleState);
    }

    function persistStateChange(
        MintScheduleState memory state,
        ScheduleItem memory item,
        uint40 time
    ) private pure {
        state.time = time;
        if (time == state.cycleStartTime + item.cycleDuration) {
            state.nextTickSupply = ABDKMath64x64.mul(
                state.nextTickSupply,
                item.cycleCompletenessMultiplier
            );
            state.cycleIndex++;
            state.cycleStartTime = time;
            if (state.cycleIndex == item.cyclesCount) {
                state.cycleIndex = 0;
                state.itemIndex++;
            }
        }
    }

    function min(uint40 a, uint40 b) private pure returns (uint40) {
        if (a < b) return a;
        return b;
    }
}

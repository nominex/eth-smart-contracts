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
        uint256 sevenDays = 6048 << 66; // 24 * 60 * 60 * 7

        // 0.0, 0.8 * 0.9, 0.8 * 0.1, 0.2, 0.0
        uint[128] poolShare1 = [0, 72 << 62, 8 << 62, 2 << 63, 0];
        // 0.0, 0.85 * 0.75 * 0.85, 0.85 * 0.75 * 0.15, 0.85 * 0.25 , 0.15
        uint[128] poolShare2 = [0, 541875 << 58, 95625 << 58, 2125 << 60, 15 << 62];
        // 0.0, 0.7 * 0.7 * 0.8, 0.7 * 0.7 * 0.2, 0.7 * 0.3, 0.30
        uint[128] poolShare3 = [0, 392 << 61, 98 << 61, 21 << 62, 3 << 63];

        /*1-28 first 28 days*/
        ScheduleItem storage item0 = items[0];
        item0.cycleDuration = sevenDays;
        item0.cyclesCount = 4;
        item0.cycleCompletenessMultiplier = 994 << 61;
        item0.poolShares = poolShare1;

        /*29-56 second 28 days*/
        ScheduleItem storage item1 = items[1];
        item1.cycleDuration = sevenDays;
        item1.cyclesCount = 4;
        item1.cycleCompletenessMultiplier = 994 << 61;
        item1.poolShares = poolShare2;

        /*57-182 - 0.5 year*/
        ScheduleItem storage item2 = items[2];
        item2.cycleDuration = sevenDays;
        item2.cyclesCount = 18;
        item2.cycleCompletenessMultiplier = 994 << 61;
        item2.poolShares = poolShare3;

        /*183-371 - 1 year*/
        ScheduleItem storage item3 = items[3];
        item3.cycleDuration = sevenDays;
        item3.cyclesCount = 27;
        item3.cycleCompletenessMultiplier = 996 << 61;
        item3.poolShares = poolShare3;

        /*372-735 - 2 year*/
        ScheduleItem storage item4 = items[4];
        item4.cycleDuration = sevenDays;
        item4.cyclesCount = 52;
        item4.cycleCompletenessMultiplier = 998 << 61;
        item4.poolShares = poolShare3;

        /*736-1463 - 4 year*/
        ScheduleItem storage item5 = items[5];
        item5.cycleDuration = sevenDays;
        item5.cyclesCount = 104;
        item5.cycleCompletenessMultiplier = 9995 << 60;
        item5.poolShares = poolShare3;

        /*1464-2926 - 8 year*/
        ScheduleItem storage item6 = items[6];
        item6.cycleDuration = sevenDays;
        item6.cyclesCount = 209;
        item6.cycleCompletenessMultiplier = 9997 << 60;
        item6.poolShares = poolShare3;

        /*2927-5481 - 15 year*/
        ScheduleItem storage item7 = items[7];
        item7.cycleDuration = sevenDays;
        item7.cyclesCount = 365;
        item7.cycleCompletenessMultiplier = 99985 << 59;
        item7.poolShares = poolShare3;

        /*5481-10962 - 30 year*/
        ScheduleItem storage item8 = items[8];
        item8.cycleDuration = sevenDays;
        item8.cyclesCount = 783;
        item8.cycleCompletenessMultiplier = 99992 << 59;
        item8.poolShares = poolShare3;

        /*10963-21917 - 60 year*/
        ScheduleItem storage item9 = items[9];
        item9.cycleDuration = sevenDays;
        item9.cyclesCount = 1565;
        item9.cycleCompletenessMultiplier = 99994 << 59;
        item9.poolShares = poolShare3;

        /*21917-36525 - 100 year*/
        ScheduleItem storage item10 = items[10];
        item10.cycleDuration = sevenDays;
        item10.cyclesCount = 2087;
        item10.cycleCompletenessMultiplier = 99995 << 59;
        item10.poolShares = poolShare3;
    }

    function setOutputRate(int128 outputRate) external onlyOwner {
        require(
            outputRate <= 1 << 64,
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

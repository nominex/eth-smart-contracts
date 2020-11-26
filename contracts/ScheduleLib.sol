// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;
pragma experimental ABIEncoderV2;

/**
 * @title RewardScheduleItem
 * @notice Structure defining reward schedule item.
 */
struct RewardScheduleItem {
        uint16 repeatCount;
        uint32 blockCount;
        uint rewardRate;
        int128 periodRepeatMultiplier;
}

struct RewardSchedule {
    uint32 distributionStart;
    RewardScheduleItem[] items;
}

library ScheduleLib {
    function copyFromMemoryToStorage(RewardSchedule memory mem, RewardSchedule storage stg) public {
        stg.distributionStart = mem.distributionStart;
        delete stg.items;
        for (uint i = 0; i < mem.items.length; ++i) {
            stg.items.push(mem.items[i]);
        }
    }
}
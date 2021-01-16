// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "../contracts/Lib.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract MintScheduleStub {

    function makeProgress(
        MintScheduleState memory scheduleState,
        uint40 time,
        MintPool pool
    ) external view returns (uint256 nmxSupply, MintScheduleState memory) {
        nmxSupply = scheduleState.nextTickSupply;

        scheduleState.time = uint40(block.timestamp);
        scheduleState.itemIndex += 1;
        scheduleState.cycleIndex += 1;
        scheduleState.cycleStartTime = uint40(block.timestamp);
        scheduleState.nextTickSupply *= 2;
        if (pool == MintPool.PRIMARY) {
            scheduleState.nextTickSupply *= 2;
        }

        return (nmxSupply, scheduleState);
    }

}

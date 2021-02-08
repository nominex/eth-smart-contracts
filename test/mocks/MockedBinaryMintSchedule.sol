// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "../../contracts/Lib.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract MockedBinaryMintSchedule {

    function makeProgress(
        MintScheduleState memory scheduleState,
        uint40 time,
        MintPool pool
    ) external view returns (uint256 nmxSupply, MintScheduleState memory) {
        if (time == uint40(block.timestamp)) {
            nmxSupply = 1;
        } else {
            nmxSupply = 2;
        }
        return (nmxSupply, scheduleState);
    }

}

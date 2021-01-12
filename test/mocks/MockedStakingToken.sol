// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockedStakingToken is ERC20 {

    uint private constant TOTAL_SUPPLY = 10000 * (10**18);

    constructor() public ERC20("Nominex LP", "NMXLP") {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

}

// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

contract MockedPayable {

    address payable private owner;

    constructor(address payable to) {
        owner = to;
    }

    fallback() external payable {}

    function close() public {
        selfdestruct(owner);
    }

}

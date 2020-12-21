// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

/*
 * @dev Interface to got minted Nmx.
 */
interface NmxSupplier {
    /*
     * @dev Mints and transfers Nmx to msg.sender.
     */
    function supplyNmx() external returns (uint256);
}

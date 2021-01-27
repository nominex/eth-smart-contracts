// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

/**
 * @dev Interface to got minted Nmx.
 */
interface NmxSupplier {
    /**
     * @dev if caller is owner of any mint pool it will be supplied with Nmx
     based on the schedule and time passed from the moment when the method was invoked by the same mint pool owner last time
     */
    function supplyNmx() external returns (uint256);
}

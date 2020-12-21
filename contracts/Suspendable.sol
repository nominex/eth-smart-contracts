// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Contract module which provides a basic suspend mechanism, where
 * there is an account (an owner) that can be granted to suspend or reactivate
 * specific functions.
 *
 * This module is used through inheritance. It will make available the modifier
 * `notSuspended`, which can be applied to your functions to restrict their use.
 */
contract Suspendable is Ownable {
    bool private _suspended = false;

    event SuspensionChanged(
        bool indexed previousValue,
        bool indexed newValue
    );

    /**
     * @dev Returns the value of the current suspension state.
     */
    function suspended() public view returns (address) {
        return _suspended;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier notSuspended() {
        require(_suspended == false, "Suspendable: the contract is under suspension");
        _;
    }

    /**
     * @dev Change suspension of the contract.
     * Can only be called by the current owner.
     */
    function changeSuspended(bool suspended) public virtual onlyOwner {
        if (suspended == _suspended) return;
        emit SuspensionChanged(_suspended, suspended);
        _suspended = suspended;
    }
}

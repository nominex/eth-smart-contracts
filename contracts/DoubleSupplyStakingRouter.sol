// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./StakingRouter.sol";

contract DoubleSupplyStakingRouter is StakingRouter {
    address immutable public additionalSupplier;

    constructor(address _nmx, address _additionalSupplier) StakingRouter(_nmx) {
        additionalSupplier = _additionalSupplier;
    }

    function receiveSupply(uint40 maxTime) override internal returns (uint256) {
        return StakingRouter.receiveSupply(maxTime) + NmxSupplier(additionalSupplier).supplyNmx(maxTime);
    }

}

// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./FixedRateNmxSupplier.sol";
import "./ConstantComplexityStakingRouter.sol";

contract DoubleSupplyStakingRouter is ConstantComplexityStakingRouter {
    address immutable public additionalSupplier;

    constructor(address _nmx) ConstantComplexityStakingRouter(_nmx) {
        FixedRateNmxSupplier fixedRateNmxSupplier = new FixedRateNmxSupplier(_nmx, address(this));
        fixedRateNmxSupplier.transferOwnership(msg.sender);
        additionalSupplier = address(fixedRateNmxSupplier);
    }

    function receiveSupply(uint40 maxTime) override internal returns (uint256) {
        return ConstantComplexityStakingRouter.receiveSupply(maxTime) + NmxSupplier(additionalSupplier).supplyNmx(maxTime);
    }

}

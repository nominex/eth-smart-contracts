// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./FixedRateNmxSupplier.sol";
import "./StakingRouter.sol";

contract DoubleSupplyStakingRouter is StakingRouter {
    address immutable public additionalSupplier;

    constructor(address _nmx) StakingRouter(_nmx) {
        FixedRateNmxSupplier fixedRateNmxSupplier = new FixedRateNmxSupplier(_nmx, address(this));
        fixedRateNmxSupplier.transferOwnership(msg.sender);
        additionalSupplier = address(fixedRateNmxSupplier);
    }

    function receiveSupply(uint40 maxTime) override internal returns (uint256) {
        return StakingRouter.receiveSupply(maxTime) + NmxSupplier(additionalSupplier).supplyNmx(maxTime);
    }

}

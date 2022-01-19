// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./FixedRateNmxSupplier.sol";
import "./StakingRouter2.sol";

contract DoubleSupplyStakingRouter is StakingRouter2 {
    address immutable public additionalSupplier;

    constructor(address _nmx) StakingRouter2(_nmx) {
        FixedRateNmxSupplier fixedRateNmxSupplier = new FixedRateNmxSupplier(_nmx, address(this));
        fixedRateNmxSupplier.transferOwnership(msg.sender);
        additionalSupplier = address(fixedRateNmxSupplier);
    }

    function receiveSupply(uint40 maxTime) override internal returns (uint256) {
        return StakingRouter2.receiveSupply(maxTime) + NmxSupplier(additionalSupplier).supplyNmx(maxTime);
    }

}

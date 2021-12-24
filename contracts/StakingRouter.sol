// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./Nmx.sol";
import "./RecoverableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakingRouter is RecoverableByOwner, NmxSupplier {
    using ABDKMath64x64 for int128;
    address immutable public nmx;
    mapping(address => int128) public serviceShares; /// @dev different StakingServices could have different shares in PRIMARY POOL
    address[] activeServices;
    uint256 pendingSupplyOfInactiveServices;
    mapping(address => uint256) public pendingSupplies; /// @dev If there is more than one StakingService it is necessary to store supplied amount of Nmx between the invocations of particular service to return correct amount of supplied tokens

    constructor(address _nmx) {
        nmx = _nmx;
    }

    /// @dev the owner can change shares of different StakingServices in PRIMARY POOL
    function changeStakingServiceShares(
        address[] calldata addresses,
        int128[] calldata shares
    ) external onlyOwner {
        require(
            addresses.length == shares.length,
            "NmxStakingRouter: addresses must be the same length as shares"
        );
        int128 cumulativeShare = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            require(addresses[i] != address(0), "NmxStakingRouter: zero address is invalid");
            require(shares[i] > 0, "NmxStakingRouter: shares must be positive");
            cumulativeShare += shares[i];
            for (uint256 j = i + 1; j < shares.length; j++) {
                require(addresses[i] != addresses[j], "NmxStakingRouter: duplicate addresses are not possible");
            }
        }
        require(
            cumulativeShare <= ABDKMath64x64.fromInt(1),
            "NmxStakingRouter: shares must be le 1<<64 in total"
        );

        updatePendingSupplies(address(0), uint40(block.timestamp));

        uint256 activeServicesLength = activeServices.length;
        uint256 _pendingSupplyOfInactiveServices = pendingSupplyOfInactiveServices;
        for (uint256 i = 0; i < activeServicesLength; i++) {
            address service = activeServices[i];
            serviceShares[service] = 0;
            _pendingSupplyOfInactiveServices += pendingSupplies[service];
        }
        for (uint256 i = 0; i < shares.length; i++) {
            address service = addresses[i];
            serviceShares[service] = shares[i];
            _pendingSupplyOfInactiveServices -= pendingSupplies[service];
        }
        pendingSupplyOfInactiveServices = _pendingSupplyOfInactiveServices;
        activeServices = addresses;
    }

    function supplyNmx(uint40 maxTime) external override returns (uint256 supply) {
        bool serviceActive;
        (supply, serviceActive) = updatePendingSupplies(_msgSender(), maxTime);
        uint256 pendingSupply = pendingSupplies[_msgSender()];
        if (pendingSupply != 0) {
            pendingSupplies[_msgSender()] = 0;
            supply += pendingSupply;
            if (!serviceActive) pendingSupplyOfInactiveServices -= pendingSupply;
        }

        bool transferred = IERC20(nmx).transfer(_msgSender(), supply);
        require(transferred, "NmxStakingRouter: NMX_FAILED_TRANSFER");
        return supply;
    }

    function getActiveServices() external view returns (address[] memory) {
        return activeServices;
    }

    function updatePendingSupplies(address requestedService, uint40 maxTime)
        private
        returns (uint256 serviceSupply, bool serviceActive)
    {
        uint256 supply = receiveSupply(maxTime);
        uint256 activeServicesLength = activeServices.length;
        for (
            uint256 activeServiceIndex = 0;
            activeServiceIndex < activeServicesLength;
            activeServiceIndex++
        ) {
            address activeService = activeServices[activeServiceIndex];
            int128 activeServiceShare = serviceShares[activeService];
            uint256 activeServiceSupply =
                ABDKMath64x64.mulu(activeServiceShare, supply);
            if (activeService == requestedService) {
                serviceSupply = activeServiceSupply;
                serviceActive = true;
            } else {
                pendingSupplies[activeService] += activeServiceSupply;
            }
        }
        return (serviceSupply, serviceActive);
    }

    function receiveSupply(uint40 maxTime) internal virtual returns (uint256) {
        return NmxSupplier(nmx).supplyNmx(maxTime);
    }

    function getRecoverableAmount(address tokenAddress) override internal view returns (uint256) {
        if (tokenAddress != nmx) return RecoverableByOwner.getRecoverableAmount(tokenAddress);
        uint256 pendingSupply = pendingSupplyOfInactiveServices;
        address[] memory _activeServices = activeServices;
        for(uint256 i = 0; i < _activeServices.length; i++) {
            pendingSupply += pendingSupplies[_activeServices[i]];
        }
        uint256 balance = IERC20(nmx).balanceOf(address(this));
        assert(balance >= pendingSupply);
        return balance - pendingSupply;
    }

}

// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./Nmx.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakingRouter is Ownable, NmxSupplier {
    using ABDKMath64x64 for int128;
    address immutable public nmx;
    mapping(address => int128) public serviceShares; /// @dev different StakingServices could have different shares in PRIMARY POOL
    address[] activeServices;
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
            require(shares[i] > 0, "NmxStakingRouter: shares must be positive");
            cumulativeShare += shares[i];
        }
        require(
            cumulativeShare <= ABDKMath64x64.fromInt(1),
            "NmxStakingRouter: shares must be le 1<<64 in total"
        );

        uint256 activeServicesLength = activeServices.length;
        for (uint256 i = 0; i < activeServicesLength; i++) {
            address service = activeServices[i];
            serviceShares[service] = 0;
        }
        for (uint256 i = 0; i < shares.length; i++) {
            serviceShares[addresses[i]] = shares[i];
        }
        activeServices = addresses;
    }

    function supplyNmx() external override returns (uint256 supply) {
        supply = updatePendingSupplies(msg.sender);
        uint256 pendingSupply = pendingSupplies[msg.sender];
        if (pendingSupply != 0) {
            pendingSupplies[msg.sender] = 0;
            supply += pendingSupply;
        }

        bool transferred = IERC20(nmx).transfer(msg.sender, supply);
        require(transferred, "NmxStakingRouter: NMX_FAILED_TRANSFER");
        return supply;
    }

    function getActiveServices() external view returns (address[] memory) {
        return activeServices;
    }

    function updatePendingSupplies(address requestedService)
        private
        returns (uint256 serviceSupply)
    {
        uint256 supply = NmxSupplier(nmx).supplyNmx();
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
            } else {
                pendingSupplies[activeService] += activeServiceSupply;
            }
        }
    }
}

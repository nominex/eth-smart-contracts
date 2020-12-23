// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./V02_Nmx.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakingRouter is Ownable, NmxSupplier {
    Nmx private nmx;
    mapping(address => int128) serviceShares;
    address[] activeServices;
    mapping(address => uint256) pendingSupplies;
    mapping(address => uint256) untransferredSupplys;

    function changeStakingServiceShares(
        address[] calldata addresses,
        int128[] calldata shares
    ) external onlyOwner {
        require(
            addresses.length == shares.length,
            "NMXSTKROU: addresses must be the same length as shares"
        );
        int128 cumulativeShare = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            require(shares[i] > 0, "NMXSTKROU: shares must be positive");
            cumulativeShare += shares[i];
        }
        require(
            cumulativeShare < 1 << 64,
            "NMXSTKROU: shares must be le 1<<64 in total"
        );

        for (uint256 i = 0; i < activeServices.length; i++) {
            address service = activeServices[i];
            serviceShares[service] = 0;
        }
        for (uint256 i = 0; i < shares.length; i++) {
            serviceShares[addresses[i]] = shares[i];
        }
        activeServices = addresses;
    }

    function supplyNmx() external override returns (uint256 supply) {
        updatePendingSupplies();
        supply = pendingSupplies[msg.sender];
        pendingSupplies[msg.sender] = 0;
        bool transferred = IERC20(nmx).transfer(msg.sender, supply);
        require(transferred, "NMXSTKROU: NMX_FAILED_TRANSFER");
        return supply;
    }

    function updatePendingSupplies() private {
        uint256 supply = nmx.supplyNmx();
        for (
            uint256 activeServiceIndex = 0;
            activeServiceIndex < activeServices.length;
            activeServiceIndex++
        ) {
            address activeService = activeServices[activeServiceIndex];
            int128 activeServiceShare = serviceShares[activeService];
            pendingSupplies[activeService] =
                pendingSupplies[activeService] +
                ABDKMath64x64.mulu(activeServiceShare, supply);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./Nmx.sol";
import "./RecoverableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakingRouter is RecoverableByOwner, NmxSupplier {
    using ABDKMath64x64 for int128;
    address immutable public nmx;

    struct ServiceSupplyState {
        uint256 pendingSupply;
        uint256 processedSupply;
        int128 share;
    }

    address[] activeServices;
    uint256 totalSupply;

    mapping(address => ServiceSupplyState) public supplyStates;

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

        totalSupply += NmxSupplier(nmx).supplyNmx(uint40(block.timestamp));

        uint256 activeServicesLength = activeServices.length;
        for (uint256 i = 0; i < activeServicesLength; i++) {
            address service = activeServices[i];
            ServiceSupplyState storage state = supplyStates[service];
            state.pendingSupply += state.share.mulu(totalSupply - state.processedSupply);
            state.share = 0;
        }

        for (uint256 i = 0; i < shares.length; i++) {
            address service = addresses[i];
            supplyStates[service].share = shares[i];
        }
        activeServices = addresses;
    }

    function supplyNmx(uint40 maxTime) external override returns (uint256 supply) {

        totalSupply += NmxSupplier(nmx).supplyNmx(maxTime);

        ServiceSupplyState storage supplyState = supplyStates[_msgSender()];
        supply = supplyState.share.mulu(totalSupply - supplyState.processedSupply) + supplyState.pendingSupply;
        supplyState.processedSupply = totalSupply;
        supplyState.pendingSupply = 0;

        bool transferred = IERC20(nmx).transfer(_msgSender(), supply);
        require(transferred, "NmxStakingRouter: NMX_FAILED_TRANSFER");
        return supply;
    }

    function getActiveServices() external view returns (address[] memory) {
        return activeServices;
    }

    function getRecoverableAmount(address tokenAddress) override internal view returns (uint256) {
        if (tokenAddress != nmx) return RecoverableByOwner.getRecoverableAmount(tokenAddress);

        uint256 pendingSupply = 0;
        address[] memory _activeServices = activeServices;
        for(uint256 i = 0; i < _activeServices.length; i++) {
            ServiceSupplyState storage supplyState = supplyStates[_activeServices[i]];
            pendingSupply += supplyState.share.mulu(totalSupply - supplyState.processedSupply) + supplyState.pendingSupply;
        }
        uint256 balance = IERC20(nmx).balanceOf(address(this));
        require(balance >= pendingSupply, "NmxStakingRouter: NMX_NEGATIVE_RECOVERABLE_AMOUNT");
        return balance - pendingSupply;
    }

}

// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./Nmx.sol";
import "./RecoverableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakingRouter2 is RecoverableByOwner, NmxSupplier {
    using ABDKMath64x64 for int128;
    address immutable public nmx;

    struct ServiceSupplyState {
        uint256 processedSupply;
        int128 share;
    }

    address[] activeServices;
    uint256 public totalSupply;

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

        uint256 _totalSupply = totalSupply;

        uint256 activeServicesLength = activeServices.length;
        for (uint256 i = 0; i < activeServicesLength; i++) {
            address service = activeServices[i];
            ServiceSupplyState storage state = supplyStates[service];
            state.processedSupply = _totalSupply;
            state.share = 0;
        }

        for (uint256 i = 0; i < shares.length; i++) {
            address service = addresses[i];
            ServiceSupplyState storage state = supplyStates[service];
            state.share = shares[i];
            state.processedSupply = _totalSupply;
        }

        activeServices = addresses;
    }

    function supplyNmx(uint40 maxTime) external override returns (uint256 supply) {

        uint256 _totalSupply = receiveSupply(maxTime) + totalSupply;
        totalSupply = _totalSupply;

        ServiceSupplyState storage supplyState = supplyStates[_msgSender()];
        supply = supplyState.share.mulu(_totalSupply - supplyState.processedSupply);
        supplyState.processedSupply = _totalSupply;

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
        uint256 _totalSupply = totalSupply;
        for(uint256 i = 0; i < _activeServices.length; i++) {
            ServiceSupplyState storage supplyState = supplyStates[_activeServices[i]];
            pendingSupply += supplyState.share.mulu(_totalSupply - supplyState.processedSupply);
        }
        uint256 balance = IERC20(nmx).balanceOf(address(this));
        require(balance >= pendingSupply, "NmxStakingRouter: NMX_NEGATIVE_RECOVERABLE_AMOUNT");
        return balance - pendingSupply;
    }

    function receiveSupply(uint40 maxTime) internal virtual returns (uint256) {
        return NmxSupplier(nmx).supplyNmx(maxTime);
    }

    function pendingSupplies(address service) external view returns (uint256) {
        ServiceSupplyState storage supplyState = supplyStates[service];
        return supplyState.share.mulu(totalSupply - supplyState.processedSupply);
    }

    function serviceShares(address service) external view returns (int128) {
        return supplyStates[service].share;
    }

}

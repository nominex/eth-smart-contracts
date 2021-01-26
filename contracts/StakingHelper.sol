// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "./StakingService.sol";

contract StakingHelper {
    address public service;

    function stakeWithPermit(
        uint128 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        address stakingToken = StakingService(service).stakingToken();
        IUniswapV2ERC20(stakingToken).permit(
            msg.sender,
            service,
            amount,
            deadline,
            v,
            r,
            s
        );
        StakingService(service).stakeFrom(msg.sender, amount);
    }
}

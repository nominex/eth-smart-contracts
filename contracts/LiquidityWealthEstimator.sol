// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

interface IERC20Extented is IERC20 {
    function decimals() external view returns (uint8);
}

/**
 * @dev mixin for estimating cost of uniswap liquididity token
 */
abstract contract LiquidityWealthEstimator {

    address private pairedToken;
    uint private pairedTokenDecimals;

    constructor(address nmx, address _stakingToken) {
        address t0 = IUniswapV2Pair(_stakingToken).token0();

        if (t0 == nmx) {
            pairedToken = IUniswapV2Pair(_stakingToken).token1();
        } else {
            pairedToken = t0;
        }

        pairedTokenDecimals = IERC20Extented(pairedToken).decimals();
    }

    function estimateWealth(uint256 liquidity) internal returns (uint256) {
        address _stakingToken = getStakingToken();
        uint totalSupply = IUniswapV2Pair(_stakingToken).totalSupply();
        uint pairedTokenBalance = IERC20(pairedToken).balanceOf(_stakingToken);
        return liquidity * pairedTokenBalance * 2 / totalSupply / 10 ** pairedTokenDecimals;
    }

    function getStakingToken() internal view virtual returns (address);

}

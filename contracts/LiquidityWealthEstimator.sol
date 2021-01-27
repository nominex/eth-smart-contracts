// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

interface IERC20Extented is IERC20 {
    function decimals() external view returns (uint8);
}

 /// @dev mixin for estimating cost of uniswap liquididity token
abstract contract LiquidityWealthEstimator {

    address private pairedToken; // USDT in pair NMX_USDT
    uint private pairedTokenDecimals;

    constructor(address nmx, address lpToken) {
        address t0 = IUniswapV2Pair(lpToken).token0();

        pairedToken = t0 != nmx ? t0 : IUniswapV2Pair(lpToken).token1();
        pairedTokenDecimals = IERC20Extented(pairedToken).decimals();
    }

    /**
     @dev returns double amount of paired token required to get lpAmount of LP tokens.
     To get lp token user must put equal amounts of NMX and paired token based on the price. That is the reason returning value is multiplied by 2
     Function is declared as public for testing purposes
    */
    function estimateWealth(uint256 lpAmount) public view returns (uint256) {
        address lpToken = lpToken();
        uint lpTotalSupply = IUniswapV2Pair(lpToken).totalSupply();
        uint pairedTokenBalance = IERC20(pairedToken).balanceOf(lpToken);
        /*
         usdt current totalSupply is about 13*10**9*10**6 = 54 bits
         nmx max supply is 200*10**6*10**18 = 88 bits
         max lp amount should be about 100*10**6*10**18
         so the numerator fits to 141 bits
        */
        return lpAmount * pairedTokenBalance * 2 / lpTotalSupply / 10 ** pairedTokenDecimals;
    }

    /// @dev should return LP token of uniswap pair
    function lpToken() internal view virtual returns (address);

}

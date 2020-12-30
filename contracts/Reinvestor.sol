pragma solidity >=0.6.12 <0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
//import "./SafeMath.sol";
import "./Math.sol";
import "./V02_StakingService.sol";

contract Reinvestor {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public nmx;
    address public pairedToken;
    address public uniswapPair;
    address public stakingService;
    address public factory;

    constructor(address _nmx, address _pairedToken, address _uniswapPair, address _stakingPool, address _factory) public {
        nmx = _nmx;
        pairedToken = _pairedToken;
        uniswapPair = _uniswapPair;
        stakingService = _stakingPool;
        factory = _factory;
    }

    function reinvest(uint256 nmxAmount, uint256 deadline, uint8 v, bytes32 r, bytes32 s, uint pairedTokenAmount) external {
        uint256 reinvestNmxAmount = getNmxAmount(nmxAmount, pairedTokenAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, uniswapPair, pairedTokenAmount);
        StakingService(stakingService).claimForReinvest(
            msg.sender,
            uniswapPair,
            reinvestNmxAmount,
            nmxAmount,
            deadline,
            v,
            r,
            s
        );
        uint liquidityMinted = IUniswapV2Pair(uniswapPair).mint(address(this));
        IUniswapV2Pair(uniswapPair).approve(stakingService, liquidityMinted);
        StakingService(stakingService).stakeFrom(msg.sender, liquidityMinted);
        IUniswapV2Pair(uniswapPair).skim(address(this));
        uint nmxBalance = IERC20(nmx).balanceOf(address(this));
        require(nmxBalance == 0);
        uint pairedBalance = IERC20(pairedToken).balanceOf(address(this));
        if (pairedBalance > 0) {
            IERC20(pairedToken).safeTransfer(msg.sender, pairedBalance);
        }
    }

    function getNmxAmount(uint nmxAmount, uint pairedTokenAmount) private view returns (uint) {
        (uint112 _reserve0, uint112 _reserve1,) = IUniswapV2Pair(uniswapPair).getReserves();
        uint _kLast = IUniswapV2Pair(uniswapPair).kLast();

        uint nmxReserve;
        uint pairedTokenReserve;

        if (nmx < pairedToken) {
            nmxReserve = _reserve0;
            pairedTokenReserve = _reserve1;
        } else {
            nmxReserve = _reserve1;
            pairedTokenReserve = _reserve0;
        }

        uint totalSupply = IUniswapV2Pair(uniswapPair).totalSupply();
        uint additionalMinted = _mintedFee(_reserve0, _reserve1, _kLast, totalSupply);
        totalSupply = totalSupply.add(additionalMinted);

        if (totalSupply == 0) {
            return nmxAmount;
        }
        uint lqFromNmx = nmxAmount.mul(totalSupply) / nmxReserve;
        uint lpFromPairedToken = pairedTokenAmount.mul(totalSupply) / pairedTokenReserve;
        if (lqFromNmx <= lpFromPairedToken) {
            return nmxAmount;
        }
        return lpFromPairedToken.mul(nmxReserve).div(totalSupply);

    }

    // if fee is on, mint liquidity equivalent to 1/6th of the growth in sqrt(k)
    function _mintedFee(uint112 _reserve0, uint112 _reserve1, uint _kLast, uint _totalSupply) private view returns (uint) {
        address feeTo = IUniswapV2Factory(factory).feeTo();
        if (feeTo != address(0)) {
            if (_kLast != 0) {
                uint rootK = Math.sqrt(uint(_reserve0).mul(_reserve1));
                uint rootKLast = Math.sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint numerator = _totalSupply.mul(rootK.sub(rootKLast));
                    uint denominator = rootK.mul(5).add(rootKLast);
                    return numerator / denominator;
                }
            }
        }
        return 0;
    }

}

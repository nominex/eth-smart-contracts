pragma solidity >=0.6.12 <0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./UniswapV2Library.sol";
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
        uint256 reinvestNmxAmount;
        (reinvestNmxAmount, pairedTokenAmount) = getNmxAmount(nmxAmount, pairedTokenAmount);
        StakingService(stakingService).claimWithAuthorization(
            msg.sender,
            reinvestNmxAmount,
            nmxAmount,
            deadline,
            v,
            r,
            s
        );

        IERC20(nmx).safeTransfer(address(this), reinvestNmxAmount);
        IERC20(pairedToken).safeTransferFrom(msg.sender, uniswapPair, pairedTokenAmount);

        uint liquidityMinted = IUniswapV2Pair(uniswapPair).mint(address(this));

        IUniswapV2Pair(uniswapPair).approve(stakingService, liquidityMinted);
        StakingService(stakingService).stakeFrom(msg.sender, liquidityMinted);
    }

    function getNmxAmount(uint nmxAmount, uint pairedTokenAmount) private view
    returns (uint requiredNmxAmount, uint requiredTokenAmount) {
        (uint nmxReserve, uint pairedTokenReserve) = UniswapV2Library.getReserves(factory, nmx, pairedToken);
        uint quotedNmxAmount = UniswapV2Library.quote(pairedTokenAmount, pairedTokenReserve, nmxReserve);
        if (quotedNmxAmount <= nmxAmount) {
            return (quotedNmxAmount, pairedTokenAmount);
        }
        return (nmxAmount, UniswapV2Library.quote(nmxAmount, nmxReserve, pairedTokenReserve));
    }

}

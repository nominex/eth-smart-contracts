pragma solidity >=0.6.12 <0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "./V02_StakingService.sol";

contract Reinvestor {
    using SafeERC20 for IERC20;

    address public nmx;
    address public pairedToken;
    address public uniswapPair;
    address public stakingService;

    constructor(address _nmx, address _pairedToken, address _uniswapPair, address _stakingPool) public {
        nmx = _nmx;
        pairedToken = _pairedToken;
        uniswapPair = _uniswapPair;
        stakingService = _stakingPool;
    }

    function reinvest(uint nmxAmount, uint pairedTokenAmount) external {
        IERC20(pairedToken).safeTransferFrom(msg.sender, uniswapPair, pairedTokenAmount);
        StakingService(stakingService).claimForReinvest(msg.sender, uniswapPair, nmxAmount);
        uint liquidityMinted = IUniswapV2Pair(uniswapPair).mint(stakingService);
        IUniswapV2Pair(uniswapPair).skim(address(this));
        uint nmxBalance = IERC20(nmx).balanceOf(address(this));
        if (nmxBalance > 0) {
            IERC20(nmx).safeTransfer(stakingService, nmxBalance);
        }
        StakingService(stakingService).reinvest(msg.sender, liquidityMinted, nmxBalance);
        uint pairedBalance = IERC20(pairedToken).balanceOf(address(this));
        if (pairedBalance > 0) {
            IERC20(pairedToken).safeTransfer(msg.sender, pairedBalance);
        }
    }

}

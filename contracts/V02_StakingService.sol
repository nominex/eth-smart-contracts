// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./NmxSupplier.sol";
import "./PausableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";

contract StakingService is PausableByOwner {
    /**
     * @param historicalRewardRate how many NMX rewards for one NMXLP
     * @param totalStaked how many NMXLP are staked in total
     */
    struct State {
        uint256 totalStaked;
        uint256 historicalRewardRate;
    }
    /**
     * @param amount how much NMXLP staked
     * @param initialRewardRate rice at which the reward was last paid
     * @param reward total nmx amount user got as a reward
     */
    struct Staker {
        uint256 amount;
        uint256 initialRewardRate;
        uint256 reward;
    }

    /**
     * @dev Nmx contract
     */
    address nmx;
    /**
     * @dev ERC20 TODO
     */
    address stakingToken;
    /**
     * @dev to got minted NMX
     */
    address nmxSupplier;
    /**
     * @dev internal service state
     */
    State state;
    /**
     * @dev mapping a staker's address to his state
     */
    mapping(address => Staker) public stakers;

    /**
     * @dev event when someone is staked NMXLP
     */
    event Staked(address indexed owner, uint256 amount);
    /**
     * @dev event when someone unstaked NMXLP
     */
    event Unstaked(address indexed owner, uint256 amount);
    /**
     * @dev event when someone is awarded NMX
     */
    event Rewarded(address indexed owner, uint256 amount);

    constructor(
        address _nmx,
        address _stakingToken,
        address _nmxSupplier
    ) {
        nmx = _nmx;
        stakingToken = _stakingToken;
        nmxSupplier = _nmxSupplier;
    }

    /**
     * @dev accepts NMXLP staked by the user, also rewards for the previously staked amount at the current rate
     * emit Staked and Rewarded events
     *
     * amount - new part of staked NMXLP
     */
    function stake(uint256 amount) public whenNotPaused {
        bool transferred =
            IERC20(stakingToken).transferFrom(
                msg.sender,
                address(this),
                amount
            );
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");
        updateHistoricalRewardRate();

        Staker storage staker = stakers[msg.sender];
        _reward(msg.sender, staker);

        emit Staked(msg.sender, amount);
        state.totalStaked += amount;
        staker.amount += amount;
    }

    function stakeWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        IUniswapV2ERC20(stakingToken).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        stake(amount);
    }

    /**
     * @dev accepts NMXLP unstaked by the user, also rewards for the previously staked amount at the current rate
     * emit Unstaked and Rewarded events
     *
     * amount - new part of staked NMXLP
     */
    function unstake(uint256 amount) external {
        Staker storage staker = stakers[msg.sender];
        require(staker.amount >= amount, "NMXSTKSRV: NOT_ENOUGH_STAKED");
        bool transferred = IERC20(stakingToken).transfer(msg.sender, amount);
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");
        updateHistoricalRewardRate();

        _reward(msg.sender, staker);

        emit Unstaked(msg.sender, amount);
        state.totalStaked -= amount;
        staker.amount -= amount;
    }

    /**
     * @dev rewards for the previously staked amount at the current rate
     * emit Rewarded event
     *
     * amount - new part of staked NMXLP
     */
    function reward(address owner) external {
        updateHistoricalRewardRate();
        _reward(owner, stakers[owner]);
    }

    /**
     * @dev make a reward and returns rewarded amount. Is supposed to be called without transaction.
     */
    function reward() external returns (uint256 rewarded) {
        address owner = msg.sender;
        Staker storage staker = stakers[owner];
        uint256 previousReward = staker.reward;
        _reward(owner, staker);
        return staker.reward - previousReward;
    }

    /**
     * @dev TODO
     */
    function _reward(address owner, Staker storage staker) private {
        uint256 unrewarded =
            ((state.historicalRewardRate - staker.initialRewardRate) *
                staker.amount) >> 64;
        emit Rewarded(owner, unrewarded);
        bool transferred = IERC20(nmx).transfer(owner, unrewarded);
        require(transferred, "NMXSTKSRV: NMX_FAILED_TRANSFER");
        staker.initialRewardRate = state.historicalRewardRate;
        staker.reward += unrewarded;
    }

    /**
     * @dev update how many NMX rewards for one NMXLP are currently
     */
    function updateHistoricalRewardRate() public {
        uint256 currentNmxSupply = NmxSupplier(nmxSupplier).supplyNmx();
        if (state.totalStaked != 0)
            state.historicalRewardRate +=
                (currentNmxSupply << 64) /
                state.totalStaked;
    }

    function totalStaked() external view returns (uint256) {
        return state.totalStaked;
    }
}

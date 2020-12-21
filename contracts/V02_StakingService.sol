// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.7.0;

import "./NmxSupplier.sol";
import "./Suspendable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingService is Suspendable {
    struct State {
        int128 historicalRewardRate;
        uint256 totalStaked;
    }

    struct Staker {
        uint256 amount;
        int128 initialRewardRate;
    }

    address nmx;
    address stakingToken;
    address nmxSupplier;
    State state;
    mapping(address => Staker) stakers;

    event Stake(address indexed owner, uint256 amount);
    event Unstake(address indexed owner, uint256 amount);
    event Rewared(address indexed owner, uint256 amount);

    constructor(
        address _nmx,
        address _stakingToken,
        address _nmxSupplier
    ) public {
        rewardToken = _rewardToken;
        stakingToken = _stakingToken;
        nmxSupplier = _nmxSupplier;
        state.timestamp = block.timestamp;
        state.totalStaked = 1; // to avoid division by zero on the first stake
    }

    function stake(uint256 amount) external notSuspended {
        bool transferred =
            IERC20(stakingToken).transferFrom(
                msg.sender,
                address(this),
                amount
            );
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");
        updateHistoricalRewardRate();

        _reward(msg.sender, stakers[owner]);

        emit Stake(msg.sender, amount);
        state.totalStaked += amount;
        staker.amount += amount;
    }

    function unstake(uint256 amount) external {
        Staker staker = stakers[owner];
        require(staker.amount >= amount, "NMXSTKSRV: NOT_ENOUGH_STAKED");
        bool transferred = IERC20(stakingToken).transfer(msg.sender, amount);
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");
        updateHistoricalRewardRate();

        _reward(msg.sender);

        emit Stake(msg.sender, amount);
        state.totalStaked += amount;
        staker.amount += amount;
    }

    function reward(address owner) external {
        updateHistoricalRewardRate();
        _reward(owner, stakers[owner]);
    }

    function _reward(address owner, Staker storage staker) private {
        int128 unrewarded =
            (state.historicalRewardRate - staker.initialRewardRate) *
                staker.amount;
        emit Rewarded(owner, rewarderFromLastStake);
        bool transferred = IERC20(nmx).transfer(owner, unrewarded);
        require(transferred, "NMXSTKSRV: NMX_FAILED_TRANSFER");
        staker.initialRewardRate = state.historicalRewardRate;
    }

    function updateHistoricalRewardRate() public {
        uint256 currentNmxSupply = NmxSupplier(nmxSupplier).supplyNmx();
        if (currentNmxSupply == 0) return;
        state.historicalRewardRate += currentNmxSupply / state.totalStaked;
    }
}

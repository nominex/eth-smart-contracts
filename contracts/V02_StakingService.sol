// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;

import "./NmxSupplier.sol";
import "./PausableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakingService is PausableByOwner {
    using ABDKMath64x64 for int128;
    struct State {
        int128 historicalRewardRate;
        int128 totalStaked;
    }

    struct Staker {
        int128 amount;
        int128 initialRewardRate;
    }

    address nmx;
    address stakingToken;
    address nmxSupplier;
    State state;
    mapping(address => Staker) stakers;

    event Staked(address indexed owner, uint256 amount);
    event Unstaked(address indexed owner, uint256 amount);
    event Rewarded(address indexed owner, uint256 amount);

    constructor(
        address _nmx,
        address _stakingToken,
        address _nmxSupplier
    ) {
        nmx = _nmx;
        stakingToken = _stakingToken;
        nmxSupplier = _nmxSupplier;
        state.totalStaked = 1; // to avoid division by zero on the first stake
    }

    function stake(uint256 amount) external whenNotPaused {
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

    function unstaked(uint256 amount) external {
        Staker storage staker = stakers[msg.sender];
        require(staker.amount >= amount, "NMXSTKSRV: NOT_ENOUGH_STAKED");
        bool transferred = IERC20(stakingToken).transfer(msg.sender, amount);
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");
        updateHistoricalRewardRate();

        _reward(msg.sender, staker);

        emit Staked(msg.sender, amount);
        state.totalStaked += amount;
        staker.amount += amount;
    }

    function reward(address owner) external {
        updateHistoricalRewardRate();
        _reward(owner, stakers[owner]);
    }

    function _reward(address owner, Staker storage staker) private {
        int128 unrewarded = state.historicalRewardRate.sub(staker.initialRewardRate).staker.amount;
        emit Rewarded(owner, unrewarded);
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

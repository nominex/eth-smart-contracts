// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.7.0;
pragma experimental ABIEncoderV2;

import "./StakingPool.sol";
import "./RewardSchedule.sol";

contract StakingPoolManager is Ownable {

    event StakingActivated(address indexed token);
    event StakingStopped(address indexed token);
    event StakingScheduleChanged();

    RewardSchedule public rewardSchedule;

    address public rewardToken;

    address[] public stakingTokens;
    uint public activePoolsCount = 0;

    struct StakingPoolInfo {
        bool active;
        address poolAddress;
    }

    mapping (address => StakingPoolInfo) public stakingPools;
    
    /* TODO: add owner to parameters if we use same contract address in all networks */
	constructor(address _rewardToken, RewardSchedule memory _rewardSchedule) public {
        rewardToken = _rewardToken;
        setSchedule(_rewardSchedule);
	}

    function addPool(address stakingToken) external onlyOwner {
        StakingPoolInfo storage poolInfo = stakingPools[stakingToken];
        require(poolInfo.poolAddress == address(0), 'pool already added');
        stakingTokens.push(stakingToken);
        activePoolsCount++;
        address poolAddress = deployStakingContract(stakingToken);
        poolInfo.poolAddress = poolAddress;
        poolInfo.active = true;
        /* TODO: calculate exact amount for pool */
        IERC20(rewardToken).approve(poolAddress, IERC20(rewardToken).balanceOf(address(this)));
        notifyPoolsDailyRewardChange();
        emit StakingActivated(stakingToken);
    }

    function deactivatePool(address stakingToken) external onlyOwner {
        StakingPoolInfo storage poolInfo = stakingPools[stakingToken];
        require(poolInfo.poolAddress != address(0), 'pool is not added');
        require(poolInfo.active, 'pool is not active');
        uint amountLeftToDistribute = StakingPool(poolInfo.poolAddress).deactivate();
        poolInfo.active = false;
        activePoolsCount--;
        /* TODO: check that amountLeftToDistribute is greater than rewardToken.balanceOf(this) */
        IERC20(rewardToken).approve(poolInfo.poolAddress, amountLeftToDistribute);
        notifyPoolsDailyRewardChange();
        emit StakingStopped(stakingToken);
    }

    function activatePool(address stakingToken) external onlyOwner {
        StakingPoolInfo storage poolInfo = stakingPools[stakingToken];
        require(poolInfo.poolAddress != address(0), 'pool is not added');
        require(!poolInfo.active, 'pool is active');
        StakingPool(poolInfo.poolAddress).activate();
        poolInfo.active = true;
        activePoolsCount++;
        /* TODO: calculate exact amount for pool */
        IERC20(rewardToken).approve(poolInfo.poolAddress, IERC20(rewardToken).balanceOf(address(this)));
        notifyPoolsDailyRewardChange();
        emit StakingActivated(stakingToken);
    }

    function notifyPoolsDailyRewardChange() private {
        setScheduleForPools();
    }

    function deployStakingContract(address stakingToken) private returns (address) {
        bytes32 salt = bytes32(uint(stakingToken));
        StakingPool stakingPool = new StakingPool{salt: salt}(stakingToken, rewardToken);
        return address(stakingPool);
    }

    function setSchedule(RewardSchedule memory _rewardSchedule) public onlyOwner {
        /* TODO: validate schedule */
        ScheduleLib.copyFromMemoryToStorage(_rewardSchedule, rewardSchedule);
        setScheduleForPools();
    }

    function setScheduleForPools() private {
        if (activePoolsCount == 0) {
            return;
        }
        RewardSchedule memory poolSchedule = rewardSchedule;
        for (uint i = 0; i < poolSchedule.items.length; ++i) {
            poolSchedule.items[i].rewardRate /= uint128(activePoolsCount); 
        }
        for (uint i = 0; i < stakingTokens.length; ++i) {
            /* TODO set allowence for pool */
            address token = stakingTokens[i];
            StakingPoolInfo storage poolInfo = stakingPools[token];
            StakingPool(poolInfo.poolAddress).setRewardSchedule(poolSchedule);
        }
    }

    function reapprovePools() public {
        for (uint i = 0; i < stakingTokens.length; ++i) {
            /* TODO set allowence for pool */
            address token = stakingTokens[i];
            StakingPoolInfo storage poolInfo = stakingPools[token];
            uint currentBalance = IERC20(rewardToken).balanceOf(address(this));
            if (poolInfo.active) {
                IERC20(rewardToken).approve(poolInfo.poolAddress, currentBalance);
            } else {
                uint amountLeftToDistribute = StakingPool(poolInfo.poolAddress).getAmountLeftToDistribute();
                IERC20(rewardToken).approve(poolInfo.poolAddress, amountLeftToDistribute);
            }
        }
    }

    function getStakingPoolInfo(address stakingToken) public view returns (StakingPoolInfo memory stakingPoolInfo) {
        return stakingPools[stakingToken];
    }

}

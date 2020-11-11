// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "./StakingPool.sol";

contract StakingPoolManager is Ownable {

    event StakingActivated(address indexed token);
    event StakingStopped(address indexed token);

    struct DailyPoolRateScheduleItem {
        uint timestamp;
        uint rateMultiplier;
    }

    DailyPoolRateScheduleItem[] public dailyPoolRewardRateSchedule;

    address public rewardToken;

    address[] public stakingTokens;
    uint public activePoolsCount = 0;

    struct StakingPoolInfo {
        bool active;
        address poolAddress;
    }

    mapping (address => StakingPoolInfo) public stakingPools;
    

	constructor(address _rewardToken) public {
        rewardToken = _rewardToken;
	}

    function addPool(address stakingToken) external onlyOwner {
        StakingPoolInfo storage poolInfo = stakingPools[stakingToken];
        require(poolInfo.poolAddress == address(0), 'pool already added');
        stakingTokens.push(stakingToken);
        activePoolsCount++;
        address poolAddress = deployStakingContract(stakingToken);
        poolInfo.poolAddress = poolAddress;
        poolInfo.active = true;
        notifyPoolsDailyRewardChange();
        emit StakingActivated(stakingToken);
    }

    function deactivatePool(address stakingToken) external onlyOwner {
        StakingPoolInfo storage poolInfo = stakingPools[stakingToken];
        require(poolInfo.poolAddress != address(0), 'pool is not added');
        require(poolInfo.active, 'pool is not active');
        StakingPool(poolInfo.poolAddress).deactivate();
        poolInfo.active = false;
        activePoolsCount--;
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
        notifyPoolsDailyRewardChange();
        emit StakingActivated(stakingToken);
    }

    function notifyPoolsDailyRewardChange() private {
        for (uint i = 0; i < stakingTokens.length; ++i) {
            address token = stakingTokens[i];
            address pool = stakingPools[token];
            if (pool.active) {
                StakingPool(pool).notifyPoolCountChanged(activePoolsCount);
            }
        }
    }

    function deployStakingContract(address stakingToken) private {
        StakingPool stakingPool = new StakingPool{salt: stakingToken}(stakingToken, rewardToken);
        stakingPool.setRewardRateSchedule(dailyPoolRewardRateSchedule);
        return address(stakingPool);
    }

}

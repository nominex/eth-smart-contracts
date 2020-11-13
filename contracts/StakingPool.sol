// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RewardSchedule.sol";

contract StakingPool is Ownable {

    event Stake(address indexed staker, uint256 amount);
    event Unstake(address indexed staker, uint256 amount);
    event Claim(address indexed staker);

    address public rewardToken;
    address public stakingToken;

    struct StakingInfo {
        uint amount;
        uint initialProfitability;
        uint claimedReward;
        uint permanentReward;
    }

    mapping(address => StakingInfo) public stakingInfoByAddress;

    RewardSchedule public rewardSchedule;

    uint currentScheduleItemIndex = 0;
    uint currentScheduleItemStartTimestamp = 0;
    uint currentRepeatCount = 0;
    uint currentRewardRate;

    uint profitability = 0;
    uint lastUpdateTimestamp = 0;
    uint totalStaked = 0;
    
    uint totalReward = 0;
    uint claimedReward = 0;

	constructor(address _rewardToken, address _stakingToken) public {
        rewardToken = _rewardToken;
        stakingToken = _stakingToken;
	}

    function setRewardSchedule(RewardSchedule memory _rewardSchedule) public onlyOwner {
        ScheduleLib.copyFromMemoryToStorage(_rewardSchedule, rewardSchedule);
    }

    function stake(uint amount) public {
        uint allowance = IERC20(stakingToken).allowance(msg.sender, address(this));
        require( allowance >= amount, 'allowance must be not less than amount');
        bool transferred = IERC20(stakingToken).transferFrom(msg.sender, address(this), amount);
        require(!!transferred);
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        changeStakedAmount(amount);
        changeUserStakeAmount(userStakingInfo, amount);
    }

    function unstake(uint amount) public {
        require(amount > 0);
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        require(userStakingInfo.amount > amount);
        bool transferred = IERC20(stakingToken).transfer(msg.sender, amount);
        require(transferred == true);

        changeStakedAmount(-amount);
        changeUserStakeAmount(userStakingInfo, -amount);
    }

    function changeStakedAmount(uint change) private {
        uint lastProfitability = profitability;
        if (block.timestamp > lastUpdateTimestamp) {
            (
                profitability,
                currentScheduleItemStartTimestamp,
                currentRewardRate,
                currentScheduleItemIndex,
                currentRepeatCount) = getProfitability(block.timestamp);
            lastUpdateTimestamp = block.timestamp;
        }
        /* FIXME: floating multiplication */ 
        totalReward += (profitability - lastProfitability) * currentRewardRate; 
        totalStaked += change;
    } 

    function getProfitability(uint timestamp) private view returns 
            (
                uint newProfitability,
                uint scheduleItemStartTimestamp,
                uint rewardRate,
                uint scheduleItemIndex,
                uint repeatCount 
                ) {
        if (timestamp <= rewardSchedule.distributionStart) {
            return (0, 0, 0, 0, 0);
        }
        uint processingPeriodStart = lastUpdateTimestamp;
        if (currentScheduleItemStartTimestamp == 0) {
            scheduleItemStartTimestamp = rewardSchedule.distributionStart;
            processingPeriodStart = rewardSchedule.distributionStart;
            rewardRate = rewardSchedule.items[0].rewardRate;
        } else {
            scheduleItemStartTimestamp = currentScheduleItemStartTimestamp;
            rewardRate = currentRewardRate;
        }

        scheduleItemIndex = currentScheduleItemIndex;
        repeatCount = currentRepeatCount;

        require(timestamp >= processingPeriodStart);
        newProfitability = profitability;

        while (timestamp > processingPeriodStart && scheduleItemIndex < rewardSchedule.items.length) {
            RewardScheduleItem storage currentItem = rewardSchedule.items[scheduleItemIndex];

            uint timePassedFromScheduleItemStart = timestamp - scheduleItemStartTimestamp;
            uint processingPeriodEnd;
            bool processingPeriodFinished = timePassedFromScheduleItemStart >= currentItem.duration;
            if (!processingPeriodFinished) {
                processingPeriodEnd = timestamp;
            } else {
                processingPeriodEnd = currentItem.duration + scheduleItemStartTimestamp;
            }
            uint processingPeriod = processingPeriodEnd - processingPeriodStart;

            /* FIXME: floating multiplication */ 
            newProfitability += processingPeriod * rewardRate / totalStaked;
            processingPeriodStart = processingPeriodEnd;

            if (!processingPeriodFinished) {
                repeatCount++;
                scheduleItemStartTimestamp = processingPeriodEnd;
                if (repeatCount >= currentItem.repeatCount) {
                    repeatCount = 0;
                    scheduleItemIndex++;
                    if (scheduleItemIndex >= rewardSchedule.items.length) {
                        break;
                    }
                    RewardScheduleItem storage nextItem = rewardSchedule.items[scheduleItemIndex];
                    if (nextItem.rewardRate != 0) {
                        rewardRate = nextItem.rewardRate;
                    } else {
                        /* FIXME: floating multiplication */
                        rewardRate *= nextItem.periodRepeatMultiplier;
                    }
                } else {
                    /* FIXME: floating multiplication */
                    rewardRate *= currentItem.periodRepeatMultiplier;
                }
            }    
        }
    } 

    function changeUserStakeAmount(StakingInfo storage userStakingInfo, uint amount) private {
        userStakingInfo.permanentReward = getTotalReward(userStakingInfo, profitability);
        userStakingInfo.amount += amount;
        userStakingInfo.initialProfitability = profitability;
    }

    function getTotalReward(StakingInfo storage userStakingInfo, uint currentProfitability) private view returns (uint) {
        return (currentProfitability - userStakingInfo.initialProfitability) * userStakingInfo.amount + userStakingInfo.permanentReward;
    }

    function getUnclaimedReward(uint timestamp) public view returns (uint) {
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        (uint currentProfitability,,,,) = getProfitability(timestamp);
        return getTotalReward(userStakingInfo, currentProfitability) - userStakingInfo.claimedReward;        
    }

    function claimReward() public returns (uint reward) {
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        (uint currentProfitability,,,,) = getProfitability(block.timestamp);
        uint userTotalReward = getTotalReward(userStakingInfo, currentProfitability);
        require(totalReward > userStakingInfo.claimedReward);
        reward = userTotalReward - userStakingInfo.claimedReward;
        bool transferred = IERC20(rewardToken).transferFrom(owner(), msg.sender, reward);
        require(transferred);
        userStakingInfo.claimedReward += reward;
        claimedReward += reward;
    }

    function getAmountLeftToDistribute() public view returns (uint) {
        uint lastProfitability = profitability;
        uint newProfitability = profitability;
        uint newRewardRate = currentRewardRate;
        if (block.timestamp > lastUpdateTimestamp) {
            (newProfitability,,newRewardRate,,) = getProfitability(block.timestamp);
        }
        /* FIXME: floating multiplication */ 
        uint newTotalReward = totalReward + (profitability - lastProfitability) * newRewardRate; 
        return newTotalReward - claimedReward;
    }

    function getCurrentStakingRate() public view returns (uint newRewardRate) {
        newRewardRate = currentRewardRate;
        if (block.timestamp > lastUpdateTimestamp) {
            (,,newRewardRate,,) = getProfitability(block.timestamp);
        }
    }

    function activate() public onlyOwner {
        /* TODO: implement */
    }

    function deactivate() external onlyOwner returns (uint) {
        return 0;
    }

}

// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "./ScheduleLib.sol";

contract StakingPool is Ownable {

    struct StakingInfo {
        uint amount;
        uint initialProfitability;
        uint claimedReward;
        uint permanentReward;
    }

    bool public active = false;

    address public rewardToken;
    address public stakingToken;

    mapping(address => StakingInfo) public stakingInfoByAddress;

    RewardSchedule public rewardSchedule;

    uint public currentScheduleItemIndex = 0;
    uint public currentScheduleItemStartBlockNumber = 0;
    uint public currentRepeatCount = 0;
    uint public currentRewardRate;

    uint public profitability = 0;
    uint public lastUpdateBlock = 0;
    uint public totalStaked = 0;
    
    uint public totalReward = 0;
    uint public claimedReward = 0;

    event Stake(address indexed staker, uint256 amount);
    event Unstake(address indexed staker, uint256 amount);
    event Claim(address indexed staker);

	constructor(address _rewardToken, address _stakingToken) public {
        rewardToken = _rewardToken;
        stakingToken = _stakingToken;
	}

    function setRewardSchedule(RewardSchedule memory _rewardSchedule) external onlyOwner {
        ScheduleLib.copyFromMemoryToStorage(_rewardSchedule, rewardSchedule);
    }

    function stake(uint amount) public {
        require(active, "pool is not active");
        uint allowance = IERC20(stakingToken).allowance(msg.sender, address(this));
        require( allowance >= amount, "allowance must be not less than amount");
        bool transferred = IERC20(stakingToken).transferFrom(msg.sender, address(this), amount);
        require(transferred == true);
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        changeStakedAmount(amount);
        changeUserStakeAmount(userStakingInfo, amount);
        emit Stake(msg.sender, amount);
    }

    function stakeWithPermit(uint amount, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        IUniswapV2ERC20(stakingToken).permit(msg.sender, address(this), amount, deadline, v, r, s);
        stake(amount);
    }

    function unstake(uint amount) external {
        require(active, "pool is not active");
        require(amount > 0);
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        require(userStakingInfo.amount >= amount, "unstake amount must be less or equal to staked amount");
        bool transferred = IERC20(stakingToken).transfer(msg.sender, amount);
        require(transferred == true);
        changeStakedAmount(-amount);
        changeUserStakeAmount(userStakingInfo, -amount);
        emit Unstake(msg.sender, amount);
    }

    function activate() external onlyOwner {
        require(!active, "Pool is active");
        saveStakingState();
        active = true;
    }

    function deactivate() external onlyOwner returns (uint) {
        require(active, "Pool is not active");
        saveStakingState();
        active = false;
        return getAmountLeftToDistribute();
    }

    function claimReward() external returns (uint reward) {
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        (uint currentProfitability,,,,) = getProfitability(block.number);
        uint userTotalReward = getTotalReward(userStakingInfo, currentProfitability);
        require(totalReward > userStakingInfo.claimedReward);
        reward = userTotalReward - userStakingInfo.claimedReward;
        bool transferred = IERC20(rewardToken).transferFrom(owner(), msg.sender, reward);
        require(transferred);
        userStakingInfo.claimedReward += reward;
        claimedReward += reward;
    }

    function getUnclaimedReward(uint blocknumber) external view returns (uint) {
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        (uint currentProfitability,,,,) = getProfitability(blocknumber);
        return getTotalReward(userStakingInfo, currentProfitability) - userStakingInfo.claimedReward;        
    }

    function getAmountLeftToDistribute() public view returns (uint) {
        uint lastProfitability = profitability;
        uint newProfitability = profitability;
        uint newRewardRate = currentRewardRate;
        (newProfitability,,newRewardRate,,) = getProfitability(block.number);
        uint newTotalReward = totalReward + (profitability - lastProfitability) * totalStaked / 10e18;
        return newTotalReward - claimedReward;
    }

    function getCurrentStakingRate() public view returns (uint newRewardRate) {
        newRewardRate = currentRewardRate;
        (,,newRewardRate,,) = getProfitability(block.number);
    }

    function changeStakedAmount(uint change) private {
        uint lastProfitability = profitability;
        saveStakingState();
        totalReward += (profitability - lastProfitability) * totalStaked / 10e18;
        totalStaked += change;
    } 

    function saveStakingState() private {
        if (active) {
            (
            profitability,
            currentScheduleItemStartBlockNumber,
            currentRewardRate,
            currentScheduleItemIndex,
            currentRepeatCount) = getProfitability(block.number);
        } else {
            (
            ,
            currentScheduleItemStartBlockNumber,
            currentRewardRate,
            currentScheduleItemIndex,
            currentRepeatCount) = getProfitability(block.number);
        }
        lastUpdateBlock = block.number;
    }

    function getProfitability(uint blockNumber) private view returns
            (
                uint newProfitability,
                uint scheduleItemStartBlockNumber,
                uint rewardRate,
                uint scheduleItemIndex,
                uint repeatCount 
                ) {
        if (blockNumber <= rewardSchedule.distributionStart || currentScheduleItemIndex >= rewardSchedule.items.length) {
            return (profitability, currentScheduleItemStartBlockNumber, 0, currentScheduleItemIndex, 0);
        }
        uint processingPeriodStart = lastUpdateBlock;
        if (currentScheduleItemStartBlockNumber == 0) {
            scheduleItemStartBlockNumber = rewardSchedule.distributionStart;
            processingPeriodStart = rewardSchedule.distributionStart;
            rewardRate = rewardSchedule.items[0].rewardRate;
        } else {
            scheduleItemStartBlockNumber = currentScheduleItemStartBlockNumber;
            rewardRate = currentRewardRate;
        }

        scheduleItemIndex = currentScheduleItemIndex;
        repeatCount = currentRepeatCount;

        require(blockNumber >= processingPeriodStart);
        newProfitability = profitability;

        while (blockNumber > processingPeriodStart && scheduleItemIndex < rewardSchedule.items.length) {
            RewardScheduleItem storage scheduleItem = rewardSchedule.items[scheduleItemIndex];

            uint blocksAfterScheduleItemStart = blockNumber - scheduleItemStartBlockNumber;
            bool processingPeriodFinished = blocksAfterScheduleItemStart >= scheduleItem.blockCount;

            uint processingPeriodEnd = (!processingPeriodFinished)
                ? blockNumber
                : scheduleItem.blockCount + scheduleItemStartBlockNumber;

            uint blocksPassed = processingPeriodEnd - processingPeriodStart;

            if (totalStaked > 0) {
                newProfitability += blocksPassed * rewardRate * 10e18 / totalStaked;
            }
            processingPeriodStart = processingPeriodEnd;

            if (processingPeriodFinished) {
                repeatCount++;
                scheduleItemStartBlockNumber = processingPeriodEnd;
                if (repeatCount >= scheduleItem.repeatCount) {
                    repeatCount = 0;
                    scheduleItemIndex++;
                    if (scheduleItemIndex >= rewardSchedule.items.length) {
                        break;
                    }
                    RewardScheduleItem storage nextItem = rewardSchedule.items[scheduleItemIndex];
                    if (nextItem.rewardRate != 0) {
                        rewardRate = nextItem.rewardRate;
                    } else {
                        rewardRate = ABDKMath64x64.mulu(nextItem.periodRepeatMultiplier, rewardRate);
                    }
                } else {
                    rewardRate = ABDKMath64x64.mulu(scheduleItem.periodRepeatMultiplier, rewardRate);
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
        return (currentProfitability - userStakingInfo.initialProfitability) * userStakingInfo.amount / 10e18 + userStakingInfo.permanentReward;
    }

}

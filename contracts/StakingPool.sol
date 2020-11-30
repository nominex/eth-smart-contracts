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

    uint public scheduleItemIndex = 0;
    uint public scheduleItemStartBlockNumber = 0;
    uint public scheduleItemRepeatCount = 0;
    uint public rewardRate;

    uint public profitability = 0;
    uint public lastUpdateBlock = 0;
    uint public totalStaked = 0;
    
    uint public totalReward = 0;
    uint public claimedReward = 0;

    uint private MULTIPLIER = 1e18;
    event Stake(address indexed staker, uint256 amount);
    event Unstake(address indexed staker, uint256 amount);
    event Claim(address indexed staker);
    event Activate();
    event Deactivate();

	constructor(address _rewardToken, address _stakingToken) public {
        rewardToken = _rewardToken;
        stakingToken = _stakingToken;
	}

    function setRewardSchedule(RewardSchedule memory _rewardSchedule) external onlyOwner {
        ScheduleLib.copyFromMemoryToStorage(_rewardSchedule, rewardSchedule);
    }

    function stake(uint amount) public {
        require(active, "NMXSTK: POOL_INACTIVE");
        uint allowance = IERC20(stakingToken).allowance(msg.sender, address(this));
        require( allowance >= amount, "NMXSTK: ALLOWANCE_TOO_SMALL");
        bool transferred = IERC20(stakingToken).transferFrom(msg.sender, address(this), amount);
        require(transferred, "NMXSTK: LP_FAILED_TRANSFER");
        updateState();
        totalStaked += amount;
        changeUserStakeAmount(stakingInfoByAddress[msg.sender], amount);
        emit Stake(msg.sender, amount);
    }

    function stakeWithPermit(uint amount, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        IUniswapV2ERC20(stakingToken).permit(msg.sender, address(this), amount, deadline, v, r, s);
        stake(amount);
    }

    function unstake(uint amount) external {
        require(active, "NMXSTK: POOL_INACTIVE");
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        require(userStakingInfo.amount >= amount, "NMXSTK: NOT_ENOUGH_STAKED");
        bool transferred = IERC20(stakingToken).transfer(msg.sender, amount);
        require(transferred, "NMXSTK: LP_FAILED_TRANSFER");
        updateState();
        totalStaked -= amount;
        changeUserStakeAmount(userStakingInfo, -amount);
        emit Unstake(msg.sender, amount);
    }

    function activate() external onlyOwner {
        require(!active, "NMXSTK: ALREADY_ACTIVE");
        updateState();
        active = true;
        emit Activate();
    }

    function deactivate() external onlyOwner returns (uint) {
        require(active, "NMXSTK: ALREADY_INACTIVE");
        updateState();
        active = false;
        emit Deactivate();
        return totalReward - claimedReward;
    }

    function claimReward() external returns (uint reward) {
        updateState();
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        uint userTotalReward = getTotalReward(userStakingInfo);
        reward = userTotalReward - userStakingInfo.claimedReward;
        bool transferred = IERC20(rewardToken).transferFrom(owner(), msg.sender, reward);
        require(transferred, "NMXSTK: NMX_TRANSFER_FAIlED");
        userStakingInfo.claimedReward += reward;
        claimedReward += reward;
    }

    function getUnclaimedReward() external returns (uint) {
        updateState();
        return getTotalReward(stakingInfoByAddress[msg.sender]) - userStakingInfo.claimedReward;
    }

    function getCurrentStakingRate() public returns (uint) {
        updateState();
        return rewardRate;
    }

    function updateState() private {

        if (block.number <= rewardSchedule.distributionStart || scheduleItemIndex >= rewardSchedule.items.length) {
            return;
        }
        require(block.number >= lastUpdateBlock);
        uint processingPeriodStart = lastUpdateBlock;
        if (scheduleItemStartBlockNumber == 0) {
            scheduleItemStartBlockNumber = rewardSchedule.distributionStart;
            processingPeriodStart = rewardSchedule.distributionStart;
            rewardRate = rewardSchedule.items[0].rewardRate;
        }

        while (block.number > processingPeriodStart && scheduleItemIndex < rewardSchedule.items.length) {
            RewardScheduleItem storage scheduleItem = rewardSchedule.items[scheduleItemIndex];

            uint blocksAfterScheduleItemStart = block.number - scheduleItemStartBlockNumber;
            bool processingPeriodFinished = blocksAfterScheduleItemStart >= scheduleItem.blockCount;

            uint processingPeriodEnd = (!processingPeriodFinished)
                ? block.number
                : scheduleItem.blockCount + scheduleItemStartBlockNumber;

            uint blocksPassed = processingPeriodEnd - processingPeriodStart;

            if (totalStaked > 0 && active) {
                uint delta = blocksPassed * rewardRate * MULTIPLIER / totalStaked;
                profitability += delta;
                totalReward += delta * totalStaked / MULTIPLIER;
            }
            processingPeriodStart = processingPeriodEnd;

            if (processingPeriodFinished) {
                scheduleItemRepeatCount++;
                scheduleItemStartBlockNumber = processingPeriodEnd;
                if (scheduleItemRepeatCount >= scheduleItem.repeatCount) {
                    scheduleItemRepeatCount = 0;
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
        userStakingInfo.permanentReward = getTotalReward(userStakingInfo);
        userStakingInfo.amount += amount;
        userStakingInfo.initialProfitability = profitability;
    }

    function getTotalReward(StakingInfo storage userStakingInfo) private view returns (uint) {
        return (profitability - userStakingInfo.initialProfitability) * userStakingInfo.amount / MULTIPLIER + userStakingInfo.permanentReward;
    }

}

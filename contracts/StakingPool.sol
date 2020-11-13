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

    uint profitability = 0;
    uint profitabilityTimestamp = 0;
    uint totalStaked = 0;


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
        profitability = getProfitobility(block.timestamp);
        totalStaked += uint(change);
        profitabilityTimestamp = block.timestamp;
    } 

    function getProfitobility(uint timestamp) private view returns (uint) {
        if (totalStaked > 0) {
            return profitability + (timestamp - profitabilityTimestamp) * getCurrentStakingRate() / totalStaked;
        }
        return profitability;
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
        return getTotalReward(userStakingInfo, getProfitobility(timestamp)) - userStakingInfo.claimedReward;        
    }

    function claimReward() public returns (uint) {
        StakingInfo storage userStakingInfo = stakingInfoByAddress[msg.sender];
        uint totalReward = getTotalReward(userStakingInfo, getProfitobility(block.timestamp));
        require(totalReward > userStakingInfo.claimedReward);
        uint reward = totalReward - userStakingInfo.claimedReward;
        bool transferred = IERC20(rewardToken).transferFrom(owner(), msg.sender, reward);
        require(transferred);
        userStakingInfo.claimedReward += reward;
    }

    function getAmountLeftToDistribute() public view returns (uint) {
        return 0;
    }

    function getCurrentStakingRate() public view returns (uint) {
        return 0;
    }

    function activate() public onlyOwner {
        /* TODO: implement */
    }

    function deactivate() external onlyOwner returns (uint) {
        return 0;
    }

}

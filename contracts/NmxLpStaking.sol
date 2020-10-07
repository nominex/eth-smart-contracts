// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "contracts/Nmx.sol";

contract NmxLpStaking {

    struct StakingInfo {
        uint amount;
        uint initialProfitability;
        uint claimedReward;
        uint permanentReward;
    }

    IERC20 nmxLp;
    IERC20 nmx;
    address rewardPool;
    mapping(address => StakingInfo) public stakingData;
    uint public stakingRate = (uint(900) * (10 ** 18) / (24 * 60 * 60 * 1000));
    uint profitability = 0;
    uint profitabilityTimestamp = 0;
    uint totalStaked = 0;



	constructor(address nmxLpAddress, address nmxAddress, address rewardPoolAddress) public {
        nmxLp = IERC20(nmxLpAddress);
        nmx = IERC20(nmxAddress);
        rewardPool = rewardPoolAddress;
	}

    function stake(uint amount) public {
        require(amount > 0);
        bool transferred = nmxLp.transferFrom(msg.sender, address(this), amount);
        require(!!transferred);
        StakingInfo storage userStakingInfo = stakingData[msg.sender];
        changeStakedAmount(int(amount));
        changeUserStakeAmount(userStakingInfo, int(amount));
    }

    function unstake(uint amount) public {
        require(amount > 0);
        StakingInfo storage userStakingInfo = stakingData[msg.sender];
        require(userStakingInfo.amount > amount);
        bool transferred = nmxLp.transfer(msg.sender, amount);
        require(transferred == true);

        changeStakedAmount(-int(amount));
        changeUserStakeAmount(userStakingInfo, -int(amount));
    }

    function changeStakedAmount(int change) private {
        profitability = getProfitobility(block.timestamp);
        totalStaked += uint(change);
        profitabilityTimestamp = block.timestamp;
    } 

    function getProfitobility(uint timestamp) private view returns (uint) {
        if (totalStaked > 0) {
            return profitability + (timestamp - profitabilityTimestamp) * stakingRate / totalStaked;
        }
        return profitability;
    } 

    function changeUserStakeAmount(StakingInfo storage userStakingInfo, int amount) private {
        userStakingInfo.permanentReward = getTotalReward(userStakingInfo, profitability);
        userStakingInfo.amount += uint(amount);
        userStakingInfo.initialProfitability = profitability;
    }


    function getTotalReward(StakingInfo storage userStakingInfo, uint currentProfitability) private view returns (uint) {
        return (currentProfitability - userStakingInfo.initialProfitability) * userStakingInfo.amount + userStakingInfo.permanentReward;
    }

    function getUnclaimedReward(uint timestamp) public view returns (uint) {
        StakingInfo storage userStakingInfo = stakingData[msg.sender];
        return getTotalReward(userStakingInfo, getProfitobility(timestamp)) - userStakingInfo.claimedReward;        
    }

    function claimReward() public returns (uint) {
        StakingInfo storage userStakingInfo = stakingData[msg.sender];
        uint totalReward = getTotalReward(userStakingInfo, getProfitobility(block.timestamp));
        require(totalReward > userStakingInfo.claimedReward);
        uint reward = totalReward - userStakingInfo.claimedReward;
        bool transferred = nmx.transferFrom(rewardPool, msg.sender, reward);
        require(transferred);
        userStakingInfo.claimedReward += reward;
    }

}

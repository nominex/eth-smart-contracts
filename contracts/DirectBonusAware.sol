// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "./LiquidityWealthEstimator.sol";

abstract contract DirectBonusAware is Ownable, LiquidityWealthEstimator {
    /**
     * @param stakedAmountInUsdt staked usdt amount required to get the multipliers (without decimals)
     * @param multiplier reward bonus multiplier for referrer (in 0.0001 parts)
     */
    struct ReferrerMultiplierData {
        uint16 stakedAmountInUsdt;
        uint16 multiplier;
    }
    uint16 public referralMultiplier; /// @dev multiplier for direct bonus for referrals of the referral program
    ReferrerMultiplierData[] public referrerMultipliers; /// @dev multipliers for direct bonuses for referrers of the referral program
    mapping(address => address) public referrers;
    uint8 stakingTokenDecimals;
    event ReferrerChanged(address indexed referral, address indexed referrer);
    event ReferrerBonusAccrued(address indexed referrer, uint128 amount); /// @dev event when someone receives an NMX from an direct referrer bonus
    event ReferralBonusAccrued(address indexed referral, uint128 amount); /// @dev event when someone receives an NMX from an direct referral bonus

    constructor(address _nmx, address _lpToken)
        LiquidityWealthEstimator(_nmx, _lpToken)
    {
        stakingTokenDecimals = IERC20Extented(_lpToken).decimals();
        referralMultiplier = 500; // 500/10000 = 0.0500 = 0.05 = 5%
        ReferrerMultiplierData storage item = referrerMultipliers.push();
        item.stakedAmountInUsdt = 100;
        item.multiplier = 500; // 500/10000 = 0.0500 = 0.05 = 5%
        item = referrerMultipliers.push();
        item.stakedAmountInUsdt = 300;
        item.multiplier = 1000; // 1000/10000 = 0.1000 = 0.10 = 10%
        item = referrerMultipliers.push();
        item.stakedAmountInUsdt = 1000;
        item.multiplier = 1500; // 1500/10000 = 0.1500 = 0.15 = 15%
        item = referrerMultipliers.push();
        item.stakedAmountInUsdt = 3000;
        item.multiplier = 2000; // 2000/10000 = 0.2000 = 0.20 = 20%
        item = referrerMultipliers.push();
        item.stakedAmountInUsdt = 10000;
        item.multiplier = 2500; // 2500/10000 = 0.2500 = 0.25 = 25%
    }

    function setReferralMultiplier(uint16 _referralMultiplier)
        external
        onlyOwner
    {
        referralMultiplier = _referralMultiplier;
    }

    function setReferrerMultipliers(
        ReferrerMultiplierData[] calldata newMultipliers
    ) external onlyOwner {
        uint256 prevStakedAmountInUsdt =
            newMultipliers.length > 0
                ? newMultipliers[0].stakedAmountInUsdt
                : 0;
        for (uint256 i = 1; i < newMultipliers.length; i++) {
            ReferrerMultiplierData calldata newMultiplier = newMultipliers[i];
            require(
                newMultiplier.stakedAmountInUsdt > prevStakedAmountInUsdt,
                "NMXSTKSRV: INVALID_ORDER"
            );
            prevStakedAmountInUsdt = newMultiplier.stakedAmountInUsdt;
        }

        while (referrerMultipliers.length != 0) {
            referrerMultipliers.pop();
        }
        for (uint256 i = 0; i < newMultipliers.length; i++) {
            referrerMultipliers.push(newMultipliers[i]);
        }
    }

    function setReferrer(address referrer) external {
        address currentReferrer = referrers[tx.origin];
        bool validReferrer =
            currentReferrer == address(0) &&
                referrer != address(0) &&
                tx.origin != referrer;
        require(validReferrer, "NMXSTKSRV: INVALID_REFERRER");
        emit ReferrerChanged(tx.origin, referrer);
        referrers[tx.origin] = referrer;
    }

    function getReferrerMultiplier(uint256 amount)
        internal
        view
        returns (int128)
    {
        return
            ABDKMath64x64.divu(
                getReferrerMultipliers(amount).multiplier,
                10000
            );
    }

    function getReferralMultiplier() internal view returns (int128) {
        return ABDKMath64x64.divu(referralMultiplier, 10000);
    }

    function getReferrerMultipliers(uint256 amount)
        private
        view
        returns (ReferrerMultiplierData memory multipliers)
    {
        uint256 amountInUsdt = estimateWealth(amount);
        amountInUsdt = amountInUsdt / 10**stakingTokenDecimals;
        for (uint256 i = 0; i < referrerMultipliers.length; i++) {
            ReferrerMultiplierData memory _multipliers = referrerMultipliers[i];
            if (amountInUsdt >= _multipliers.stakedAmountInUsdt) {
                multipliers = _multipliers;
            } else {
                break;
            }
        }
    }
}

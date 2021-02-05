// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

abstract contract DirectBonusAware is Ownable {
    /**
     * @param stakedAmountInUsdt staked usdt amount required to get the multipliers (without decimals)
     * @param multiplier reward bonus multiplier for referrer (in 0.0001 parts)
     */
    struct ReferrerMultiplierData {
        uint16 stakedAmountInUsdt;
        uint16 multiplier;
    }
    uint16 public referralMultiplier; /// @dev multiplier for direct bonus for referrals of the referral program (in 0.0001 parts)
    ReferrerMultiplierData[] public referrerMultipliers; /// @dev multipliers for direct bonuses for referrers of the referral program
    mapping(address => address) public referrers; /// @dev referral address => referrer address
    event ReferrerChanged(address indexed referral, address indexed referrer); /// @dev when referral set its referrer
    event ReferrerBonusAccrued(address indexed referrer, uint128 amount); /// @dev when someone receives NMX as a direct referrer bonus
    event ReferralBonusAccrued(address indexed referral, uint128 amount); /// @dev when someone receives NMX as a direct referral bonus

    constructor() {
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

    /// @dev referral direct bonus multiplier can be changed by the owner
    function setReferralMultiplier(uint16 _referralMultiplier)
        external
        onlyOwner
    {
        referralMultiplier = _referralMultiplier;
    }

    /// @dev referrer direct bonus multipliers can be changed by the owner
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
                "NmxStakingService: INVALID_ORDER"
            );
            prevStakedAmountInUsdt = newMultiplier.stakedAmountInUsdt;
        }

        delete referrerMultipliers;
        for (uint256 i = 0; i < newMultipliers.length; i++) {
            referrerMultipliers.push(newMultipliers[i]);
        }
    }

    /// @dev every referral (address, tx.origin) can set its referrer. But only once. So nobody can change referrer if it has been set already
    function setReferrer(address referrer) external {
        address currentReferrer = referrers[tx.origin];
        bool validReferrer =
            currentReferrer == address(0) &&
                referrer != address(0) &&
                tx.origin != referrer;
        require(validReferrer, "NmxStakingService: INVALID_REFERRER");
        emit ReferrerChanged(tx.origin, referrer);
        referrers[tx.origin] = referrer;
    }

    /**
     * @dev returns current referrer direct bonus multiplier. Result is int128 compatible with ABDKMath64x64 lib.
     *
     * @param amountInUsdt staking lp tokens amount in USDT
     * @param pairedTokenDecimals amount of decimals of paired token
     */
    function getReferrerMultiplier(uint256 amountInUsdt, uint8 pairedTokenDecimals)
        internal
        view
        returns (int128)
    {
        return
            ABDKMath64x64.divu(
                getReferrerMultipliers(amountInUsdt / 10**pairedTokenDecimals).multiplier,
                10000
            );
    }

    /// @dev returns current referral direct bonus multiplier. Result is int128 compatible with ABDKMath64x64 lib
    function getReferralMultiplier() internal view returns (int128) {
        return ABDKMath64x64.divu(referralMultiplier, 10000);
    }

    function getReferrerMultipliers(uint256 amountInUsdt)
        private
        view
        returns (ReferrerMultiplierData memory multipliers)
    {
        uint256 referrerMultipliersLength = referrerMultipliers.length;
        for (uint256 i = 0; i < referrerMultipliersLength; i++) {
            ReferrerMultiplierData memory _multipliers = referrerMultipliers[i];
            if (amountInUsdt >= _multipliers.stakedAmountInUsdt) {
                multipliers = _multipliers;
            } else {
                break;
            }
        }
    }
}

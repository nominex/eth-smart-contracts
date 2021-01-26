// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma abicoder v2;

import "./NmxSupplier.sol";
import "./Nmx.sol";
import "./PausableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";

contract StakingService is PausableByOwner {
    /**
     * @param historicalRewardRate how many NMX rewards for one NMXLP (<< 40)
     * @param totalStaked how many NMXLP are staked in total
     */
    struct State {
        uint128 totalStaked;
        uint128 historicalRewardRate;
    }
    /**
     * @param amount how much NMXLP staked
     * @param initialRewardRate rice at which the reward was last paid (<< 40)
     * @param reward total nmx amount user got as a reward
     */
    struct Staker {
        address referrer;
        uint256 amount;
        uint128 initialRewardRate;
        uint128 reward;
        uint256 claimedReward;
    }
    /**
     * @param stakedAmountInUsdt staked usdt amount required to get the multipliers (without decimals)
     * @param multiplier reward bonus multiplier for referrer (in 0.0001 parts)
     */
    struct ReferrerMultiplierData {
        uint16 stakedAmountInUsdt;
        uint16 multiplier;
    }

    bytes32 public DOMAIN_SEPARATOR;

    string private constant CLAIM_TYPE = "Claim(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)";
    bytes32 public constant CLAIM_TYPEHASH = keccak256(abi.encodePacked(CLAIM_TYPE));

    string private constant UNSTAKE_TYPE = "Unstake(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)";
    bytes32 public constant UNSTAKE_TYPEHASH = keccak256(abi.encodePacked(UNSTAKE_TYPE));

    mapping(address => uint256) public nonces;

    /**
     * @dev Nmx contract
     */
    address public nmx;
    /**
     * @dev ERC20 TODO
     */
    address public stakingToken;
    /**
     * @dev to got minted NMX
     */
    address public nmxSupplier;
    /**
     * @dev internal service state
     */
    State public state;

    /**
     * @dev mapping a staker's address to his state
     */
    mapping(address => Staker) public stakers;

    uint16 public referralMultiplier; /// @dev multiplier for direct bonus for referrals of the referral program
    ReferrerMultiplierData[] public referrerMultipliers; /// @dev multipliers for direct bonuses for referrers of the referral program

    /**
     * @dev event when someone is staked NMXLP
     */
    event Staked(address indexed owner, uint128 amount);
    /**
     * @dev event when someone unstaked NMXLP
     */
    event Unstaked(address indexed from, address indexed to, uint128 amount);
    /**
     * @dev event when someone is awarded NMX
     */
    event Rewarded(address indexed from, address indexed to, uint128 amount);
    event ReferrerChanged(address indexed referral, address indexed referrer);
    /**
     * @dev event when someone receives an NMX as a staking bonus
     */
    event StakingBonusAccrued(address indexed staker, uint128 amount);
    /**
    /**
     * @dev event when someone receives an NMX from an direct referrer bonus
     */
    event ReferrerBonusAccrued(address indexed referrer, uint128 amount);
    /**
     * @dev event when someone receives an NMX from an direct referral bonus
     */
    event ReferralBonusAccrued(address indexed referral, uint128 amount);

    constructor(
        address _nmx,
        address _stakingToken,
        address _nmxSupplier
    ) {
        nmx = _nmx;
        stakingToken = _stakingToken;
        nmxSupplier = _nmxSupplier;

        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("StakingService")),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );

    }

    function setReferralMultiplier(uint16 _referralMultiplier) external onlyOwner {
        referralMultiplier = _referralMultiplier;
    }

    function setReferrerMultipliers(ReferrerMultiplierData[] calldata newMultipliers) external onlyOwner {
        uint256 prevStakedAmountInUsdt = newMultipliers.length > 0 ? newMultipliers[0].stakedAmountInUsdt : 0;
        for (uint256 i = 1; i < newMultipliers.length; i++) {
            ReferrerMultiplierData calldata newMultiplier = newMultipliers[i];
            require(newMultiplier.stakedAmountInUsdt > prevStakedAmountInUsdt, "NMXSTKSRV: INVALID_ORDER");
            prevStakedAmountInUsdt = newMultiplier.stakedAmountInUsdt;
        }

        while(referrerMultipliers.length != 0) {
            referrerMultipliers.pop();
        }
        for (uint256 i = 0; i < newMultipliers.length; i++) {
            referrerMultipliers.push(newMultipliers[i]);
        }
    }

    function setReferrer(address referrer) external {
        Staker storage staker = stakers[tx.origin];
        bool validReferrer = staker.referrer == address(0) && referrer != address(0) && tx.origin != referrer;
        require(validReferrer, "NMXSTKSRV: INVALID_REFERRER");
        emit ReferrerChanged(tx.origin, referrer);
        staker.referrer = referrer;
    }

    /**
     * @dev accepts NMXLP staked by the user, also rewards for the previously staked amount at the current rate
     * emit Staked and Rewarded events
     *
     * amount - new part of staked NMXLP
     */
    function stake(uint128 amount) external whenNotPaused {
        _stakeFrom(msg.sender, amount);
    }

    function stakeWithPermit(
        uint128 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        IUniswapV2ERC20(stakingToken).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        _stakeFrom(msg.sender, amount);
    }

    function stakeFrom(
        address owner,
        uint128 amount
    ) external whenNotPaused {
        _stakeFrom(owner, amount);
    }

    function _stakeFrom(address owner, uint128 amount) private {
        bool transferred =
        IERC20(stakingToken).transferFrom(
            owner,
            address(this),
            uint256(amount)
        );
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");

        Staker storage staker = updateStateAndStaker(owner);

        emit Staked(owner, amount);
        state.totalStaked += amount;
        staker.amount += amount;
    }

    /**
     * @dev accepts NMXLP unstaked by the user, also rewards for the previously staked amount at the current rate
     * emit Unstaked and Rewarded events
     *
     * amount - new part of staked NMXLP
     */
    function unstake(uint128 amount) external {
        _unstake(msg.sender, msg.sender, amount);
    }

    function unstakeTo(address to, uint128 amount) external {
        _unstake(msg.sender, to, amount);
    }

    function unstakeWithAuthorization(
        address owner,
        uint128 amount,
        uint128 signedAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s) external {
        require(amount <= signedAmount, "NMXSTKSRV: INVALID_AMOUNT");
        verifySignature(UNSTAKE_TYPEHASH, owner, msg.sender, signedAmount, deadline, v, r, s);
        _unstake(owner, msg.sender, amount);
    }

    function _unstake(address from, address to, uint128 amount) private {
        Staker storage staker = updateStateAndStaker(from);
        require(staker.amount >= amount, "NMXSTKSRV: NOT_ENOUGH_STAKED");
        bool transferred = IERC20(stakingToken).transfer(to, amount);
        require(transferred, "NMXSTKSRV: LP_FAILED_TRANSFER");

        emit Unstaked(from, to, amount);
        state.totalStaked -= amount;
        staker.amount -= amount;
    }

    /**
     * @dev get the whole reward for yourself
     */
    function claimReward() external returns (uint256) {
        Staker storage staker = updateStateAndStaker(msg.sender);
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        _claimReward(staker, msg.sender, msg.sender, unclaimedReward);
        return unclaimedReward;
    }

    /**
     * @dev receive the entire reward to a different address
     *
     * @param to address to receive the award
     */
    function claimRewardTo(address to) external returns (uint256) {
        Staker storage staker = updateStateAndStaker(msg.sender);
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        _claimReward(staker, msg.sender, to, unclaimedReward);
        return unclaimedReward;
    }

    function claimWithAuthorization(
        address owner,
        uint128 nmxAmount,
        uint128 signedAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s) external {
        require(nmxAmount <= signedAmount, "NMXSTKSRV: INVALID_NMX_AMOUNT");
        verifySignature(CLAIM_TYPEHASH, owner, msg.sender, signedAmount, deadline, v, r, s);

        Staker storage staker = updateStateAndStaker(owner);
        _claimReward(staker, owner, msg.sender, nmxAmount);
    }

    function updateStateAndStaker(address stakerAddress) private returns (Staker storage staker) {
        updateHistoricalRewardRate();
        staker = stakers[stakerAddress];

        uint128 unrewarded =
        ((state.historicalRewardRate - staker.initialRewardRate) *
        uint128(staker.amount)) >> 40;
        emit StakingBonusAccrued(stakerAddress, unrewarded);

        if (staker.referrer != address(0) && unrewarded > 0) {
            Staker storage referrer = stakers[staker.referrer];

            int128 referrerMultiplier = getReferrerMultiplier(referrer.amount);
            int128 referralMultiplier = getReferralMultiplier();
            uint128 referrerBonus = uint128(ABDKMath64x64.mulu(referrerMultiplier, uint256(unrewarded)));
            uint128 referralBonus = uint128(ABDKMath64x64.mulu(referralMultiplier, uint256(unrewarded)));

            uint128 supplied = Nmx(nmx).requestDirectBonus(referrerBonus + referralBonus);
            if (supplied < referrerBonus) {
                referrerBonus = supplied;
            }
            supplied -= referrerBonus;
            if (supplied < referralBonus) {
                referralBonus = supplied;
            }

            emit ReferrerBonusAccrued(staker.referrer, referrerBonus);
            referrer.reward += referrerBonus;

            emit ReferralBonusAccrued(stakerAddress, referralBonus);
            unrewarded += referralBonus;
        }

        staker.initialRewardRate = state.historicalRewardRate;
        staker.reward += unrewarded;
    }

    function getReferrerMultiplier(uint256 amount) private view returns (int128 multiplier) {
        return ABDKMath64x64.divu(getDirectBonusMultipliers(amount).multiplier, 10000);
    }

    function getReferralMultiplier() private view returns (int128) {
        return ABDKMath64x64.divu(referralMultiplier, 10000);
    }

    function getDirectBonusMultipliers(uint256 amount) private view returns (ReferrerMultiplierData memory multipliers) {
        uint256 amountInUsdt = amount; // todo
        amountInUsdt = amountInUsdt/10**ERC20(stakingToken).decimals();
        for (uint256 i = 0; i < referrerMultipliers.length; i++) {
            ReferrerMultiplierData memory _multipliers = referrerMultipliers[i];
            if (amountInUsdt >= _multipliers.stakedAmountInUsdt) {
                multipliers = _multipliers;
            } else {
                break;
            }
        }
    }

    function _claimReward(Staker storage staker, address from, address to, uint128 amount) private {
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        require(amount <= unclaimedReward, "NMXSTKSRV: NOT_ENOUGH_BALANCE");
        emit Rewarded(from, to, amount);
        bool transferred = IERC20(nmx).transfer(to, amount);
        require(transferred, "NMXSTKSRV: NMX_FAILED_TRANSFER");
        staker.claimedReward += amount;
    }

    function verifySignature(bytes32 typehash, address owner, address spender, uint128 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) private {
        require(deadline >= block.timestamp, "NMXSTKSRV: EXPIRED");
        bytes32 digest =
        keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        typehash,
                        owner,
                        spender,
                        value,
                        nonces[owner]++,
                        deadline
                    )
                )
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(
            recoveredAddress != address(0) && recoveredAddress == owner,
            "NMX: INVALID_SIGNATURE"
        );
    }

    /**
     * @dev updates state and returns unclaimed reward amount.
     */
    function getReward() external returns (uint256 unclaimedReward) {
        Staker memory staker = updateStateAndStaker(msg.sender);
        unclaimedReward = staker.reward - staker.claimedReward;
    }

    /**
     * @dev update how many NMX rewards for one NMXLP are currently
     */
    function updateHistoricalRewardRate() public {
        if (paused()) {
            return;
        }
        uint128 currentNmxSupply = uint128(NmxSupplier(nmxSupplier).supplyNmx());
        if (state.totalStaked != 0 && currentNmxSupply != 0)
            state.historicalRewardRate +=
            (currentNmxSupply << 40) /
            state.totalStaked;
    }

    function changeNmxSupplier(address newNmxSupplier) external onlyOwner {
        nmxSupplier = newNmxSupplier;
    }

    function totalStaked() external view returns (uint128) {
        return state.totalStaked;
    }

}

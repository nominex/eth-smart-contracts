// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma abicoder v2;

import "./DirectBonusAware.sol";
import "./LiquidityWealthEstimator.sol";
import "./NmxSupplier.sol";
import "./Nmx.sol";
import "./PausableByOwner.sol";
import "./RecoverableByOwner.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract StakingService is PausableByOwner, RecoverableByOwner, DirectBonusAware, LiquidityWealthEstimator {
    /**
     * @param totalStaked amount of NMXLP currently staked in the service
     * @param historicalRewardRate how many NMX minted per one NMXLP (<< 40). Never decreases.
     */
    struct State {
        uint128 totalStaked;
        uint128 historicalRewardRate;
    }
    /**
     * @param amount of NMXLP currently staked by the staker
     * @param initialRewardRate value of historicalRewardRate before last update of the staker's data
     * @param reward total amount of Nmx accrued to the staker
     * @param claimedReward total amount of Nmx the staker transferred from the service already
     */
    struct Staker {
        uint256 amount;
        uint128 initialRewardRate;
        uint128 reward;
        uint256 claimedReward;
    }

    bytes32 immutable public DOMAIN_SEPARATOR;

    string private constant CLAIM_TYPE =
        "Claim(address owner,address spender,uint128 value,uint256 nonce,uint256 deadline)";
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256(abi.encodePacked(CLAIM_TYPE));

    string private constant UNSTAKE_TYPE =
        "Unstake(address owner,address spender,uint128 value,uint256 nonce,uint256 deadline)";
    bytes32 public constant UNSTAKE_TYPEHASH =
        keccak256(abi.encodePacked(UNSTAKE_TYPE));

    mapping(address => uint256) public nonces;

    address immutable public nmx; /// @dev Nmx contract
    address immutable public stakingToken; /// @dev NmxLp contract of uniswap
    address public nmxSupplier;
    State public state; /// @dev internal service state
    mapping(address => Staker) public stakers; /// @dev mapping of staker's address to its state

    event Staked(address indexed owner, uint128 amount); /// @dev someone is staked NMXLP
    event Unstaked(address indexed from, address indexed to, uint128 amount); /// @dev someone unstaked NMXLP
    event Rewarded(address indexed from, address indexed to, uint128 amount); /// @dev someone transferred Nmx from the service
    event StakingBonusAccrued(address indexed staker, uint128 amount); /// @dev Nmx accrued to the staker

    constructor(
        address _nmx,
        address _stakingToken,
        address _nmxSupplier
    ) DirectBonusAware() LiquidityWealthEstimator(_nmx, _stakingToken) {
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

    /**
     @dev function to stake permitted amount of LP tokens from uniswap contract
     @param amount of NMXLP to be staked in the service
     */
    function stake(uint128 amount) external {
        _stakeFrom(_msgSender(), amount);
    }

    function stakeWithPermit(
        uint128 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IUniswapV2ERC20(stakingToken).permit(
            _msgSender(),
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        _stakeFrom(_msgSender(), amount);
    }

    function stakeFrom(address owner, uint128 amount) external {
        _stakeFrom(owner, amount);
    }

    function _stakeFrom(address owner, uint128 amount) private whenNotPaused {
        bool transferred =
            IERC20(stakingToken).transferFrom(
                owner,
                address(this),
                uint256(amount)
            );
        require(transferred, "NmxStakingService: LP_FAILED_TRANSFER");

        Staker storage staker = updateStateAndStaker(owner, amount > 0);

        emit Staked(owner, amount);
        state.totalStaked += amount;
        staker.amount += amount;
    }

    /**
     @dev function to unstake LP tokens from the service and transfer to uniswap contract
     @param amount of NMXLP to be unstaked from the service
     */
    function unstake(uint128 amount) external {
        Staker storage staker = updateStateAndStaker(_msgSender(), false);
        _unstake(staker, _msgSender(), _msgSender(), amount);
    }

    function unstakeTo(address to, uint128 amount) external {
        Staker storage staker = updateStateAndStaker(_msgSender(), false);
        _unstake(staker, _msgSender(), to, amount);
    }

    function unstakeWithAuthorization(
        address owner,
        uint128 amount,
        uint128 signedAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(amount <= signedAmount, "NmxStakingService: INVALID_AMOUNT");
        verifySignature(
            UNSTAKE_TYPEHASH,
            owner,
            _msgSender(),
            signedAmount,
            deadline,
            v,
            r,
            s
        );
        Staker storage staker = updateStateAndStaker(owner, amount > 0);
        _unstake(staker, owner, _msgSender(), amount);
    }

    function _unstake(
        Staker storage staker,
        address from,
        address to,
        uint128 amount
    ) private {
        require(staker.amount >= amount, "NmxStakingService: NOT_ENOUGH_STAKED");

        emit Unstaked(from, to, amount);
        state.totalStaked -= amount;
        staker.amount -= amount;

        bool transferred = IERC20(stakingToken).transfer(to, amount);
        require(transferred, "NmxStakingService: LP_FAILED_TRANSFER");
    }

    /**
     * @dev updates current reward and transfers it to the caller's address
     */
    function claimReward() external returns (uint256) {
        Staker storage staker = updateStateAndStaker(_msgSender(), false);
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        _claimReward(staker, _msgSender(), _msgSender(), unclaimedReward);
        return unclaimedReward;
    }

    function claimRewardTo(address to) external returns (uint256) {
        Staker storage staker = updateStateAndStaker(_msgSender(), false);
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        _claimReward(staker, _msgSender(), to, unclaimedReward);
        return unclaimedReward;
    }

    function claimRewardToWithoutUpdate(address to) external returns (uint256) {
        Staker storage staker = stakers[_msgSender()];
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        _claimReward(staker, _msgSender(), to, unclaimedReward);
        return unclaimedReward;
    }

    function claimWithAuthorization(
        address owner,
        uint128 nmxAmount,
        uint128 signedAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(nmxAmount <= signedAmount, "NmxStakingService: INVALID_NMX_AMOUNT");
        verifySignature(
            CLAIM_TYPEHASH,
            owner,
            _msgSender(),
            signedAmount,
            deadline,
            v,
            r,
            s
        );

        Staker storage staker = updateStateAndStaker(owner, nmxAmount > 0);
        _claimReward(staker, owner, _msgSender(), nmxAmount);
    }

    function updateStateAndStaker(address stakerAddress, bool ignoreValidation)
        private
        returns (Staker storage staker)
    {
        require(
            ignoreValidation || stakerAddress == _msgSender() || stakerAddress == tx.origin,
            "NmxStakingService: PERMISSION_DENIED"
        );
        updateHistoricalRewardRate();
        staker = stakers[stakerAddress];

        uint128 unrewarded = uint128(((state.historicalRewardRate - staker.initialRewardRate) * staker.amount) >> 40);
        emit StakingBonusAccrued(stakerAddress, unrewarded);

        if (unrewarded > 0) {
            address referrerAddress = referrers[stakerAddress];
            if (referrerAddress != address(0)) {
                Staker storage referrer = stakers[referrerAddress];

                int128 referrerMultiplier =
                    getReferrerMultiplier(estimateWealth(referrer.amount), _pairedTokenDecimals());
                int128 referralMultiplier = getReferralMultiplier();
                uint128 referrerBonus =
                    uint128(
                        ABDKMath64x64.mulu(
                            referrerMultiplier,
                            uint256(unrewarded)
                        )
                    );
                uint128 referralBonus =
                    uint128(
                        ABDKMath64x64.mulu(
                            referralMultiplier,
                            uint256(unrewarded)
                        )
                    );

                uint128 supplied =
                    Nmx(nmx).requestDirectBonus(referrerBonus + referralBonus);
                if (supplied < referrerBonus) {
                    referrerBonus = supplied;
                }
                supplied -= referrerBonus;
                if (supplied < referralBonus) {
                    referralBonus = supplied;
                }

                emit ReferrerBonusAccrued(referrerAddress, referrerBonus);
                referrer.reward += referrerBonus;

                emit ReferralBonusAccrued(stakerAddress, referralBonus);
                unrewarded += referralBonus;
            }
        }

        staker.initialRewardRate = state.historicalRewardRate;
        staker.reward += unrewarded;
    }

    function _claimReward(
        Staker storage staker,
        address from,
        address to,
        uint128 amount
    ) private {
        uint128 unclaimedReward = staker.reward - uint128(staker.claimedReward);
        require(amount <= unclaimedReward, "NmxStakingService: NOT_ENOUGH_BALANCE");
        emit Rewarded(from, to, amount);
        staker.claimedReward += amount;
        bool transferred = IERC20(nmx).transfer(to, amount);
        require(transferred, "NmxStakingService: NMX_FAILED_TRANSFER");
    }

    function verifySignature(
        bytes32 typehash,
        address owner,
        address spender,
        uint128 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private {
        require(deadline >= block.timestamp, "NmxStakingService: EXPIRED");
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
            "NmxStakingService: INVALID_SIGNATURE"
        );
    }

    /**
     * @dev updates state and returns unclaimed reward amount. Is supposed to be invoked as call from metamask to display current amount of Nmx available
     */
    function getReward() external returns (uint256 unclaimedReward) {
        Staker memory staker = updateStateAndStaker(_msgSender(), false);
        unclaimedReward = staker.reward - staker.claimedReward;
    }

    function updateHistoricalRewardRate() public {
        uint256 currentNmxSupply = NmxSupplier(nmxSupplier).supplyNmx(uint40(block.timestamp));
        if (state.totalStaked != 0 && currentNmxSupply != 0) {
            uint128 additionalRewardRate = uint128((currentNmxSupply << 40) / state.totalStaked);
            state.historicalRewardRate += additionalRewardRate;
        } else {
            ERC20(nmx).transfer(owner(), currentNmxSupply);
        }
    }

    function changeNmxSupplier(address newNmxSupplier) external onlyOwner {
        nmxSupplier = newNmxSupplier;
    }

    function totalStaked() external view returns (uint128) {
        return state.totalStaked;
    }

    function _lpToken() internal view override returns (address) {
        return stakingToken;
    }

    function getDomainSeparator() internal view override returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    function getRecoverableAmount(address tokenAddress) override internal view returns (uint256) {
        // there is no way to know exact amount of nmx service owns to the stakers
        require(tokenAddress != nmx, 'NmxStakingService: INVALID_RECOVERABLE_TOKEN');
        if (tokenAddress == stakingToken) {
            uint256 _totalStaked = state.totalStaked;
            uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
            assert(balance >= _totalStaked);
            return balance - _totalStaked;
        }
        return RecoverableByOwner.getRecoverableAmount(tokenAddress);
    }

}

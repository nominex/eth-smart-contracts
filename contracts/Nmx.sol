// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./NmxSupplier.sol";
import "./MintSchedule.sol";
import "./RecoverableByOwner.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Nmx is ERC20, NmxSupplier, RecoverableByOwner {
    bytes32 immutable public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    address immutable public mintSchedule;
    mapping(address => MintPool) public poolByOwner;
    address[3] public poolOwners; // 3 - number of MintPool values
    /** @dev dedicated state for every pool to decrease gas consumtion in case of staking/unstaking - no updates related to other mint pools are required to be persisted */
    MintScheduleState[3] public poolMintStates; // 3 - number of MintPool values

    uint40 private constant DISTRIBUTION_START_TIME = 1611705600; // 2021-01-27T00:00:00Z

    event PoolOwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner,
        MintPool indexed pool
    );

    constructor(address _mintSchedule) ERC20("Nominex", "NMX") {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name())),
                keccak256(bytes("1")),
                chainId,
                address(this)
            )
        );
        mintSchedule = _mintSchedule;
        for (
            uint256 i = uint256(MintPool.PRIMARY);
            i <= uint256(MintPool.NOMINEX);
            i++
        ) {
            MintScheduleState storage poolMintState = poolMintStates[i];
            poolMintState.nextTickSupply =
                (10000 * 10**18) /
                uint40(1 days) +
                1; // +1 - to coupe with rounding error when daily supply is 9999.9999...
            poolMintState.time = DISTRIBUTION_START_TIME;
            poolMintState.weekStartTime = DISTRIBUTION_START_TIME;
        }
        _mint(_msgSender(), 117000 * 10**18); // amount of Nmx has been distributed or sold already at the moment of contract deployment
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(deadline >= block.timestamp, "NMX: deadline expired");
        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            PERMIT_TYPEHASH,
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
            "NMX: invalid signature"
        );
        _approve(owner, spender, value);
    }

    /// @dev the contract owner can change any of mint pool owners
    function transferPoolOwnership(MintPool pool, address newOwner) external {
        address currentOwner = poolOwners[uint256(pool)];
        require(
            newOwner != currentOwner,
            "NMX: new owner must differs from the old one"
        );
        require(
            _msgSender() == owner() || _msgSender() == currentOwner,
            "NMX: only owner can transfer pool ownership"
        );
        MintPool existentPoolOfNewOwner = poolByOwner[newOwner];
        require(MintPool.DEFAULT_VALUE == existentPoolOfNewOwner || newOwner == address(0), "NMX: every pool must have dedicated owner");

        emit PoolOwnershipTransferred(currentOwner, newOwner, pool);
        poolOwners[uint256(pool)] = newOwner;
        poolByOwner[currentOwner] = MintPool.DEFAULT_VALUE;
        poolByOwner[newOwner] = pool;
    }

    /**
      @dev if caller is owner of any mint pool it will be supplied with Nmx based on the schedule and time passed from the moment
      when the method was invoked by the same mint pool owner last time
      @param maxTime the upper limit of the time to make calculations
    */
    function supplyNmx(uint40 maxTime) external override returns (uint256) {
        if (maxTime > uint40(block.timestamp)) maxTime = uint40(block.timestamp);
        MintPool pool = poolByOwner[_msgSender()];
        if (pool == MintPool.DEFAULT_VALUE) return 0;
        MintScheduleState storage state = poolMintStates[uint256(pool)];
        (uint256 supply, MintScheduleState memory newState) =
            MintSchedule(mintSchedule).makeProgress(
                state,
                maxTime,
                pool
            );
        poolMintStates[uint256(pool)] = newState;
        _mint(_msgSender(), supply);
        return supply;
    }

    /// @dev view function to support displaying PRIMARY POOL daily supply on UI
    function rewardRate() external view returns (uint256) {
        (, MintScheduleState memory newState) =
            MintSchedule(mintSchedule).makeProgress(
                poolMintStates[uint256(MintPool.PRIMARY)],
                uint40(block.timestamp),
                MintPool.PRIMARY
            );
        return uint256(newState.nextTickSupply);
    }
}

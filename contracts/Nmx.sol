// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./NmxSupplier.sol";
import "./MintSchedule.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Nmx is ERC20, NmxSupplier, Ownable {
    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    address public mintSchedule;
    mapping(address => MintPool) public poolByOwner;
    address[5] public poolOwners; // 5 - number of MintPool values
    MintScheduleState[5] public poolMintStates; // 5 - number of MintPool values

    uint40 private constant DISTRIBUTION_START_TIME = 1609545600; // 2021-02-01T00:00:00Z
    uint128 private constant DIRECT_POOL_RATE = 115740740740740740; // amount per second (18 decimals)
    uint128 private constant DIRECT_POOL_TOTAL_SUPPLY_LIMIT = 40*10**6*10**18;
    uint128 public directPoolTotalSupply;
    mapping(address => bool) public directPoolOwnerByAddress;
    address[] public directPoolOwners;

    event PoolOwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner,
        MintPool indexed pool
    );

    event DirectPoolOwnershipGranted(
        address indexed owner
    );

    event DirectPoolOwnershipRevoked(
        address indexed owner
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
            poolMintState.nextTickSupply = (10000 * 10**18) / uint40(1 days);
            poolMintState.time = DISTRIBUTION_START_TIME;
            poolMintState.cycleStartTime = DISTRIBUTION_START_TIME;
        }
        _mint(msg.sender, 117000 * 10**18);
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

    function requestDirectBonus(uint128 amount) external returns (uint128) {
        require(directPoolOwnerByAddress[msg.sender], "NMX: caller is not the owner of DirectPool");
        if (block.timestamp < DISTRIBUTION_START_TIME) return 0;
        uint128 directPoolRest = DIRECT_POOL_TOTAL_SUPPLY_LIMIT - directPoolTotalSupply;
        uint128 scheduledRest = uint128((block.timestamp - DISTRIBUTION_START_TIME) * DIRECT_POOL_RATE) - directPoolTotalSupply;
        if (directPoolRest > scheduledRest) {
            directPoolRest = scheduledRest;
        }
        if (directPoolRest < amount) {
            amount = directPoolRest;
        }
        if (amount == 0) return 0;
        directPoolTotalSupply += amount;
        _mint(msg.sender, amount);
        return amount;
    }

    function setDirectPoolOwners(address[] calldata newOwners) external onlyOwner {
        for (uint256 i = 0; i < directPoolOwners.length; i++) {
            address oldOwner = directPoolOwners[i];
            emit DirectPoolOwnershipRevoked(oldOwner);
            directPoolOwnerByAddress[oldOwner] = false;
        }

        for (uint256 i = 0; i < newOwners.length; i++) {
            address newOwner = newOwners[i];
            emit DirectPoolOwnershipGranted(newOwner);
            directPoolOwnerByAddress[newOwner] = true;
        }

        directPoolOwners = newOwners;
    }

    function transferPoolOwnership(MintPool pool, address newOwner) external {
        address currentOwner = poolOwners[uint256(pool)];
        require(
            newOwner != currentOwner,
            "NMX: new owner must differs from the old one"
        );
        require(
            msg.sender == owner() || msg.sender == currentOwner,
            "NMX: only owner can transfer pool ownership"
        );
        for (
            uint256 existentPool = uint256(MintPool.PRIMARY);
            existentPool <= uint256(MintPool.NOMINEX);
            existentPool++
        ) {
            address existentOwner = poolOwners[uint256(existentPool)];
            require(
                newOwner != existentOwner || newOwner == address(0),
                "NMX: every pool must have dedicated owner"
            );
        }

        emit PoolOwnershipTransferred(currentOwner, newOwner, pool);
        poolOwners[uint256(pool)] = newOwner;
        poolByOwner[currentOwner] = MintPool.DEFAULT_VALUE;
        poolByOwner[newOwner] = pool;
    }

    function supplyNmx() external override returns (uint256) {
        MintPool pool = poolByOwner[msg.sender];
        if (pool == MintPool.DEFAULT_VALUE) return 0;
        MintScheduleState storage state = poolMintStates[uint256(pool)];
        (uint256 supply, MintScheduleState memory newState) =
            MintSchedule(mintSchedule).makeProgress(
                state,
                uint40(block.timestamp),
                pool
            );
        poolMintStates[uint256(pool)] = newState;
        _mint(msg.sender, supply);
        return supply;
    }

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

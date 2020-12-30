// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./NmxSupplier.sol";
import "./V02_MintSchedule.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Nmx is ERC20, NmxSupplier, Ownable {
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;
    address public mintSchedule;
    mapping(address => MintPool) poolByOwner;
    address[5] poolOwners; // 5 - number of MintPool values
    MintScheduleState[5] poolMintStates; // 5 - number of MintPool values

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
        uint40 day = 1 days;
        for (
            uint256 i = uint256(MintPool.PRIMARY);
            i <= uint256(MintPool.NOMINEX);
            i++
        ) {
            MintScheduleState storage poolMintState = poolMintStates[i];
            poolMintState.nextTickSupply = 10000 * 10**18 / day;
            poolMintState.time = uint40(block.timestamp);
            poolMintState.cycleStartTime = uint40(block.timestamp);
        }
        /*
         * FIXME: если я правильно понял, то это то, что было куплено пользователями,
         * но вроде как нет возможности это вывести, возможно _mint(msg.sender)?
         */
        _mint(address(this), 117000 * 10**18);
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
        require(deadline >= block.timestamp, "NMX: EXPIRED");
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
            "NMX: INVALID_SIGNATURE"
        );
        _approve(owner, spender, value);
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

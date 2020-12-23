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
    MintSchedule schedule;
    mapping(address => MintPool) poolByOwner;
    address[] poolOwners;
    MintScheduleState[] poolMintStates;

    event PoolOwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner,
        MintPool indexed pool
    );

    constructor() ERC20("Nominex", "NMX") {
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
        // todo fill the field with MintScheduleStates
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
            uint existentPool = uint(MintPool.PRIMARY);
            existentPool <= uint(MintPool.NOMINEX);
            existentPool++
        ) {
            address existentOwner = poolOwners[uint256(existentPool)];
            require(
                newOwner != existentOwner || newOwner == address(0),
                "NMX: every pool must have dedicated owner"
            );
        }

        emit PoolOwnershipTransferred(currentOwner, newOwner, pool);
        poolOwners[uint(pool)] = newOwner;
        poolByOwner[currentOwner] = MintPool(0);
        poolByOwner[newOwner] = pool;
    }

    function supplyNmx() external override returns (uint256) {
        MintPool pool = poolByOwner[msg.sender];
        if (pool == MintPool.DEFAULT_VALUE) return 0;
        MintScheduleState storage state = poolMintStates[uint256(pool)];
        (uint256 supply, MintScheduleState memory newState) =
            schedule.makeProgress(state, block.timestamp, pool);
        poolMintStates[uint256(pool)] = newState;
        _mint(msg.sender, supply);
        return supply;
    }

    function rewardRate() external view returns (uint256) {
        (, MintScheduleState memory newState) =
            schedule.makeProgress(
                poolMintStates[uint256(MintPool.PRIMARY)],
                block.timestamp,
                MintPool.PRIMARY
            );
        return uint256(newState.nextTickSupply);
    }
}

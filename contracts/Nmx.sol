// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Nmx is ERC20 {

	uint32 private constant TOTAL_SUPPLY = 200000000;
	
	bytes32 public DOMAIN_SEPARATOR;
	bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint) public nonces;

	event Transfer(address indexed _from, address indexed _to, uint256 _value);

	constructor() public ERC20("Nominex", "NMX") {

        uint chainId;
        assembly {
            chainId := chainid()
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name())),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );

		_mint(msg.sender, TOTAL_SUPPLY);
	}

	function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'NMX: EXPIRED');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'NMX: INVALID_SIGNATURE');
        _approve(owner, spender, value);
    }

}

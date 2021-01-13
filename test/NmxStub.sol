pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../contracts/NmxSupplier.sol";

contract NmxStub is ERC20, NmxSupplier {
    constructor() ERC20("Nmx Stub", "NMXSTB") {}

    function supplyNmx() external override returns (uint256 supply) {
        supply = 1 * 10**18;
        _mint(msg.sender, supply);
    }
}

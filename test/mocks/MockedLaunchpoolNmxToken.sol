// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../contracts/NmxSupplier.sol";

contract MockedLaunchpoolNmxToken is ERC20, NmxSupplier {
    uint256 public supply = 10**18;
    uint256 private constant TOTAL_SUPPLY = 10000 * (10**18);

    constructor() ERC20("Nominex", "NMX") {
        _mint(_msgSender(), TOTAL_SUPPLY);
    }

    function supplyNmx(uint40 endTime) external override returns (uint256) {
        _mint(_msgSender(), supply);
        return supply;
    }

    function setSupply(uint256 newSupply) external {
        supply = newSupply;
    }
}

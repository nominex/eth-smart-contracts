// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../contracts/NmxSupplier.sol";

contract MockedNmxToken is ERC20, NmxSupplier {
    uint256 public supply = 10**18;
    uint128 public maxDirectBonus = 100 * 10 ** 18;

    constructor() ERC20("Nominex", "NMX") {}

    function supplyNmx() external override returns (uint256) {
        _mint(msg.sender, supply);
        return supply;
    }

    function setSupply(uint256 newSupply) external {
        supply = newSupply;
    }

    function requestDirectBonus(uint128 amount) external returns (uint128) {
        return amount < maxDirectBonus ? amount : maxDirectBonus;
    }

    function setMaxDirectBonus(uint128 newMaxDirectBonus) external {
        maxDirectBonus = newMaxDirectBonus;
    }
}

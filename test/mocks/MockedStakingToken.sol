pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockedStakingToken is ERC20 {
    uint256 private constant TOTAL_SUPPLY = 10000 * (10**18);

    constructor() ERC20("Nominex LP", "NMXLP") {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    function token0() external view returns (address) {
        return address(this);
    }
}

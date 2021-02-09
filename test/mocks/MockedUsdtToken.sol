pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockedUsdtToken is ERC20 {
    uint256 private constant TOTAL_SUPPLY = 1000000 * (10**6);

    constructor() ERC20("Mocked USDT", "USDT") {
        _setupDecimals(6);
        _mint(msg.sender, TOTAL_SUPPLY);
    }
}

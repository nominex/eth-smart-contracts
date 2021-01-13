pragma solidity >=0.4.25 <0.8.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Nmx.sol";
import "../contracts/StakingPool.sol";

contract TestLpStaking {

  function testInitialBalanceUsingDeployedContract() public {
    Nmx nmx = new Nmx();
    /* any ERC20 token for example another instance of nmx */
    Nmx nmxLp = new Nmx();

    StakingPool lpStaking = new StakingPool(address(nmx), address(nmxLp));
    nmx.approve(address(lpStaking), 100000000);

    uint expected = 200000000 * (10**18);
    Assert.equal(nmx.balanceOf(address(this)), expected, "Owner should have 200000000 Nmx initially");
  }

}

pragma solidity >=0.4.25 <0.7.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/NmxLpStaking.sol";

contract TestLpStaking {

  function testInitialBalanceUsingDeployedContract() public {
    Nmx nmx = new Nmx();
    /* any ERC20 token for example another instance of nmx */
    Nmx nmxLp = new Nmx();

    NmxLpStaking lpStaking = new NmxLpStaking(address(nmxLp), address(nmx), address(this));
    nmx.approve(address(lpStaking), 100000000);

    uint expected = 200000000 * (10**18);
    Assert.equal(nmx.balanceOf(address(this)), expected, "Owner should have 200000000 Nmx initially");
  }

}

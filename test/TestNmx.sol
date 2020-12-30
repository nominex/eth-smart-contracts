pragma solidity >=0.4.25 <0.8.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Nmx.sol";

contract TestNmx {

  function testInitialBalanceUsingDeployedContract() public {
    Nmx nmx = Nmx(DeployedAddresses.Nmx());

    uint expected = (200000000) * (10**18);

    Assert.equal(nmx.balanceOf(tx.origin), expected, "Owner should have 200000000 Nmx initially");
  }


  function testInitialBalanceWithNewNmx() public {
    Nmx nmx = new Nmx();

    uint expected = 200000000 * (10**18);

    Assert.equal(nmx.balanceOf(address(this)), expected, "Current contract should have 200000000 Nmx initially");
  }

}

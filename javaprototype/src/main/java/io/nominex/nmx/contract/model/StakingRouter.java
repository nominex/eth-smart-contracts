package io.nominex.nmx.contract.model;

import java.util.Map;

public interface StakingRouter extends Ownable, Suspendable, Address {

    @OnlyOwner
    void changeStakingServiceShares(Map<Address, Double> newShares);

    Map<Address, Double> stakingServiceShares();

    double totalSupplied();

    double mint(); // transfers reward and returns amount

}

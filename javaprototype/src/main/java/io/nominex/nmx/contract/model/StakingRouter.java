package io.nominex.nmx.contract.model;

import java.util.Map;

public interface StakingRouter extends Ownable, Suspendable {

    @OnlyOwner
    void changeStakingServiceShares(Map<Address, Double> newShares);

    Map<Address, Double> stakingServiceShares();

}

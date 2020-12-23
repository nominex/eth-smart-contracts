package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.Address;
import io.nominex.nmx.contract.model.InvocationContext;
import io.nominex.nmx.contract.model.NmxSupplier;
import io.nominex.nmx.contract.model.RequireNotSuspended;
import io.nominex.nmx.contract.model.Staker;
import java.util.Map;

public class StakingService implements io.nominex.nmx.contract.model.StakingService {

    Address nmx;
    NmxSupplier nmxSupplier;
    Address stakingToken;
    Map<Address, Staker> stakers;
    private StakingServiceState state;

    @Override
    @RequireNotSuspended
    public void stake(double amount) {
        boolean transferred = stakingToken.transferFrom(InvocationContext.sender, this, amount);
        if (!transferred) throw new RuntimeException();
        updateState();
        state.totalStaked += amount;
        Staker staker = stakers.get(InvocationContext.sender);
        double unrewarded = (state.historicalRewardRate - staker.initialRewardRate) * staker.amount;
        nmx.transferFrom(this, InvocationContext.sender, unrewarded);

        staker.amount += amount;
        staker.initialRewardRate = state.historicalRewardRate;
    }

    @Override
    public void stakeWithPermit(double amount, long deadline, int v, byte[] r, byte[] s) {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    @Override
    public void unstake(double amount) {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    public void updateState() {
        double currentSupply = nmxSupplier.supplyNmx();
        if (currentSupply == 0) return;
        state.historicalRewardRate += currentSupply / state.totalStaked;
    }

}

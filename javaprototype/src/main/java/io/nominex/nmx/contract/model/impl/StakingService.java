package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.Address;
import io.nominex.nmx.contract.model.InvocationContext;
import io.nominex.nmx.contract.model.RequireNotSuspended;
import io.nominex.nmx.contract.model.Staker;
import io.nominex.nmx.contract.model.StakingRouter;
import java.util.Map;

public class StakingService implements io.nominex.nmx.contract.model.StakingService {

    Address rewardToken;
    StakingRouter rewardSupplier;
    Address stakingToken;
    Map<Address, Staker> stakers;
    private boolean suspended;
    private StakingServiceState state;

    @Override
    @RequireNotSuspended
    public void stake(double amount) {
        boolean transferred = stakingToken.transferFrom(InvocationContext.sender, this, amount);
        if (!transferred) throw new RuntimeException();
        checkSupply();
        state.totalStaked += amount;
        Staker staker = stakers.get(InvocationContext.sender);
        double rewardedFromLastStake = (state.historicalRewardRate - staker.initialRewardRate) * staker.amount;
        staker.rewarded += rewardedFromLastStake;

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

    public void checkSupply() {
        double currentSupply = rewardSupplier.mint();
        if (currentSupply == 0) return;
        state.totalSupply += currentSupply;
        state.time = InvocationContext.timestamp;
        state.historicalRewardRate += currentSupply / state.totalStaked;
    }

}

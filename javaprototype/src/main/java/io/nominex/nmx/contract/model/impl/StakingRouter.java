package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.Address;
import io.nominex.nmx.contract.model.InvocationContext;
import java.util.Map;

public class StakingRouter implements io.nominex.nmx.contract.model.StakingRouter {

    private Nmx nmx;
    private Map<Address, Double> shares;

    @Override
    public void changeStakingServiceShares(Map<Address, Double> newShares) {
        // make sure shares are <= 1 in total
        // update current services states ? (or just invoke dedicated method if required)
        // set current services shares to 0
        // set next share values
    }

    @Override
    public Map<Address, Double> stakingServiceShares() {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    @Override
    public double totalSupplied() {
        throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
    }

    @Override
    public double mint() {
        double share = shares.get(InvocationContext.sender);
        if (share == 0) return 0;
        double nmxSupplied = nmx.supplyNmx();
        for (Map.Entry<Address, Double> entry : shares.entrySet()) {
            if (entry.getValue() == 0) continue;
            nmx.transferFrom(this, entry.getKey(), nmxSupplied * entry.getValue());
        }
        return nmxSupplied * share;
    }

}

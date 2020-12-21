package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.Address;
import io.nominex.nmx.contract.model.InvocationContext;
import io.nominex.nmx.contract.model.MintPool;
import io.nominex.nmx.contract.model.NmxSupplier;
import java.util.Map;

public class Nmx implements io.nominex.nmx.contract.model.Nmx, NmxSupplier {

    private MintSchedule schedule;
    private Map<Address, MintPool> poolOwners;
    private Map<MintPool, MintScheduleState> mintStates;

    @Override
    public void transferPoolOwnership(MintPool pool, Address newOwner) {
        // check pool owners differs from each other
        poolOwners.put(newOwner, pool);
    }

    @Override
    public double supplyNmx() {
        MintPool pool = poolOwners.get(InvocationContext.sender);
        if (pool == MintPool.DEFAULT_VALUE) return 0;
        double supply = schedule.makeProgress(mintStates.get(pool), InvocationContext.timestamp);
        mint(InvocationContext.sender, supply);
        return supply;
    }

    public void mint(Address address, double amount) {

    }

}

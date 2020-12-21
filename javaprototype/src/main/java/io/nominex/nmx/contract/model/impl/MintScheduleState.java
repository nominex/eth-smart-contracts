package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.MintPool;

public class MintScheduleState {

    long time;
    int itemIndex;
    int cycleIndex;
    long cycleStartTime;
    double nextTickSupply;
    MintPool pool;

    public MintScheduleState(double firstTickSupply, long time, MintPool pool) {
        this.cycleIndex = 0;
        this.cycleStartTime = time;
        this.itemIndex = 0;
        this.nextTickSupply = firstTickSupply;
        this.time = time;
        this.pool = pool;
    }

}

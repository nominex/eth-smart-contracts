package io.nominex.nmx.contract.model.impl;

public class MintScheduleState {

    long time;
    int itemIndex;
    int cycleIndex;
    long cycleStartTime;
    double nextTickSupply;

    public MintScheduleState(double firstTickSupply, long time) {
        this.cycleIndex = 0;
        this.cycleStartTime = time;
        this.itemIndex = 0;
        this.nextTickSupply = firstTickSupply;
        this.time = time;
    }

}

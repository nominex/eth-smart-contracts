package io.nominex.nmx.contract.model.impl;

public class MintScheduleState {

    long time;
    int itemIndex;
    int cycleIndex;
    long cycleStartTime;
    double nextTickTotalSupply;
    double cumulativeSupply;
    double cumulativeSupplyBonus;
    double cumulativeSupplyTeam;
    double cumulativeSupplyNominex;

    public MintScheduleState(double firstTickSupply, long time) {
        this.cycleIndex = 0;
        this.cycleStartTime = time;
        this.itemIndex = 0;
        this.nextTickTotalSupply = firstTickSupply;
        this.time = time;
        this.cumulativeSupply = 0;
    }

}

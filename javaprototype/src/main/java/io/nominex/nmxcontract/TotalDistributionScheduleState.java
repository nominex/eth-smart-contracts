package io.nominex.nmxcontract;

public class TotalDistributionScheduleState {

    long time;
    int itemIndex;
    int cycleIndex;
    long cycleStartTime;
    double nextTickSupply;
    double cumulativeTotalSupply;

    public TotalDistributionScheduleState(double firstTickSupply, long time) {
        this.cycleIndex = 0;
        this.cycleStartTime = time;
        this.itemIndex = 0;
        this.nextTickSupply = firstTickSupply;
        this.time = time;
        this.cumulativeTotalSupply = 0;
    }

}

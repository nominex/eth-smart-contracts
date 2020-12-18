package io.nominex.nmxcontract;

public class PoolDistributionScheduleRelativeItem {

    final long duration;
    final double[] poolFactors;

    public PoolDistributionScheduleRelativeItem(long duration, double[] poolFactors) {
        this.duration = duration;
        this.poolFactors = poolFactors;
    }

}

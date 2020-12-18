package io.nominex.nmxcontract;

public class PoolDistributionScheduleAbsoluteItem {

    final long startTime;
    final double[] poolFactors;

    public PoolDistributionScheduleAbsoluteItem(long startTime, double[] poolFactors) {
        this.startTime = startTime;
        this.poolFactors = poolFactors;
    }

}

package io.nominex.nmxcontract;

public class PoolDistributionSchedule {

    private PoolDistributionScheduleAbsoluteItem[] items;

    public PoolDistributionSchedule(PoolDistributionScheduleRelativeItem[] items, long start) {
        this.items = new PoolDistributionScheduleAbsoluteItem[items.length];
        long totalDuration = 0;
        for (int i = 0; i < items.length; i++) {
            var relativeItem = items[i];
            var absoluteItem = new PoolDistributionScheduleAbsoluteItem(start + totalDuration, relativeItem.poolFactors);
            this.items[i] = absoluteItem;
            totalDuration += relativeItem.duration;
        }
    }

    public long nextTime(long prevTime, long time) {
        throw new UnsupportedOperationException("pool change boundaries must be reflected in total pool schedule");
    }

    double[] poolFactors(long time) {
        for (int i = items.length - 1; i >= 0; i--) {
            PoolDistributionScheduleAbsoluteItem item = items[i];
            if (item.startTime <= time) return item.poolFactors;
        }
        return new double[DistributionPool.values().length];
    }

    double totalPoolSupply(long time, DistributionPool pool, double totalSupply) {
        return poolFactors(time)[pool.ordinal()] * totalSupply;
    }

}

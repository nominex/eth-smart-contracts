package io.nominex.nmxcontract;

import static io.nominex.nmxcontract.Consts.SECONDS_PER_DAY;

public class TotalDistributionScheduleItem {

    final int cycleDuration;
    final int cyclesCount;
    final double cycleCompletenessMultiplier;

    public TotalDistributionScheduleItem(int cycleDurationDays, int cyclesCount, double cycleCompletenessMultiplier) {
        this.cycleDuration = cycleDurationDays * SECONDS_PER_DAY;
        this.cyclesCount = cyclesCount;
        this.cycleCompletenessMultiplier = cycleCompletenessMultiplier;
    }

}

package io.nominex.nmx.contract.model.impl;

import static io.nominex.nmx.contract.model.impl.Consts.SECONDS_PER_DAY;

public class MintScheduleItem {

    final long cycleDuration;
    final int cyclesCount;
    final double cycleCompletenessMultiplier;
    final MintShares shares;

    public MintScheduleItem(
            int cycleDurationDays,
            int cyclesCount,
            double cycleCompletenessMultiplier,
            MintShares poolShares) {
        this.cycleDuration = cycleDurationDays * SECONDS_PER_DAY;
        this.cyclesCount = cyclesCount;
        this.cycleCompletenessMultiplier = cycleCompletenessMultiplier;
        this.shares = poolShares;
    }

}

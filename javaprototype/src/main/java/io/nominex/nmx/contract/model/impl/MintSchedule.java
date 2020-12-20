package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.MintPool;
import static java.lang.Long.min;
import java.util.Map;

public class MintSchedule {

    private MintScheduleItem[] items;
    private Map<MintPool, MintScheduleState> states;

    public MintSchedule() {
        MintShares shares_01_30 = new MintShares(0.8 * 0.9, 0.8 * 0.1, 0.2, 0);
        MintShares shares_31_60 = new MintShares(0.85 * 0.75 * 0.85, 0.85 * 0.75 * 0.15, 0.75 * 0.25, 0.15);
        MintShares shares_61_xx = new MintShares(0.7 * 0.7 * 0.8, 0.7 * 0.7 * 0.2, 0.7 * 0.3, 0.30);

        MintScheduleItem[] items = new MintScheduleItem[]{new MintScheduleItem(0, 0, 0, shares_61_xx)};
        this.items = items;
    }

    MintSchedule(MintScheduleItem[] items) {
        this.items = items;
    }

    public void update(MintScheduleState scheduleState, long time) {
        if (time <= scheduleState.time) return;
        while (time > scheduleState.time && scheduleState.itemIndex < items.length) {
            MintScheduleItem item = null;
            if (scheduleState.itemIndex < items.length) item = items[scheduleState.itemIndex];
            if (item != null) {
                long boundary = min(time, scheduleState.cycleStartTime + item.cycleDuration);
                long secondsFromLastUpdate = boundary - scheduleState.time;
                double supplyFromLastUpdate = secondsFromLastUpdate * scheduleState.nextTickTotalSupply;
                scheduleState.cumulativeSupply += supplyFromLastUpdate * item.shares.primary;
                scheduleState.cumulativeSupplyBonus += supplyFromLastUpdate * item.shares.bonus;
                scheduleState.cumulativeSupplyTeam += supplyFromLastUpdate * item.shares.team;
                scheduleState.cumulativeSupplyNominex += supplyFromLastUpdate * item.shares.nominex;
                persistStateChange(scheduleState, item, boundary);
            }
        }
    }

    private void persistStateChange(MintScheduleState state, MintScheduleItem item, long time) {
        state.time = time;
        if (time == state.cycleStartTime + item.cycleDuration) {
            state.nextTickTotalSupply *= item.cycleCompletenessMultiplier;
            state.cycleIndex++;
            state.cycleStartTime = time;
            if (state.cycleIndex == item.cyclesCount) {
                state.cycleIndex = 0;
                state.itemIndex++;
            }
        }
    }

}

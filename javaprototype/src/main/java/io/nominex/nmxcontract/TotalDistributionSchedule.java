package io.nominex.nmxcontract;

import static java.lang.Long.min;

public class TotalDistributionSchedule {

    TotalDistributionScheduleItem[] items;

    public TotalDistributionSchedule(double firstTickSupply, TotalDistributionScheduleItem[] items, long time) {
        this.items = items;
    }

    void update(TotalDistributionScheduleState scheduleState, long time) {
        if (time <= scheduleState.time) return;
        while (time > scheduleState.time && scheduleState.itemIndex < items.length) {
            TotalDistributionScheduleItem item = null;
            if (scheduleState.itemIndex < items.length) item = items[scheduleState.itemIndex];
            if (item != null) {
                long boundary = min(time, scheduleState.cycleStartTime + item.cycleDuration);
                long secondsFromLastUpdate = boundary - scheduleState.time;
                scheduleState.cumulativeTotalSupply += secondsFromLastUpdate * scheduleState.nextTickSupply;
                updateScheduleState(scheduleState, item, boundary);
            }
        }
    }

    private void updateScheduleState(TotalDistributionScheduleState state, TotalDistributionScheduleItem item, long time) {
        state.time = time;
        if (time == state.cycleStartTime + item.cycleDuration) {
            state.nextTickSupply *= item.cycleCompletenessMultiplier;
            state.cycleIndex++;
            state.cycleStartTime = time;
            if (state.cycleIndex == item.cyclesCount) {
                state.cycleIndex = 0;
                state.itemIndex++;
            }
        }
    }

}

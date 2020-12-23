package io.nominex.nmx.contract.model.impl;

import io.nominex.nmx.contract.model.MintPool;
import io.nominex.nmx.contract.model.OnlyOwner;
import io.nominex.nmx.contract.model.Ownable;
import static java.lang.Long.min;

public class MintSchedule implements Ownable {

    private MintScheduleItem[] items;
    private double outputRate = 1; // in case some Nmx will be minted in another blockchain

    public MintSchedule() {
        Double[] shares_01_30 = new Double[]{0.0, 0.8 * 0.9, 0.8 * 0.1, 0.2, 0.0};
        Double[] shares_31_60 = new Double[]{0.0, 0.85 * 0.75 * 0.85, 0.85 * 0.75 * 0.15, 0.75 * 0.25, 0.15};
        Double[] shares_61_xx = new Double[]{0.0, 0.7 * 0.7 * 0.8, 0.7 * 0.7 * 0.2, 0.7 * 0.3, 0.30};

        MintScheduleItem[] items = new MintScheduleItem[]{new MintScheduleItem(0, 0, 0, shares_61_xx)};
        this.items = items;
    }

    @OnlyOwner
    public void setOutputRate(double outputRate) {
        if (outputRate > 1) throw new RuntimeException();
        this.outputRate = outputRate;
    }

    public double makeProgress(MintScheduleState state, long time, MintPool pool) {
        if (time <= state.time) return 0;
        double result = 0;
        while (time > state.time && state.itemIndex < items.length) {
            // todo handle last item in a special maner (set nextTickSupply accordingly to the rest of tokens) ?
            MintScheduleItem item = null;
            if (state.itemIndex < items.length) item = items[state.itemIndex];
            if (item != null) {
                long boundary = min(time, state.cycleStartTime + item.cycleDuration);
                long secondsFromLastUpdate = boundary - state.time;
                result += secondsFromLastUpdate * state.nextTickSupply * outputRate * item.poolShares[pool.ordinal()];
                persistStateChange(state, item, boundary);
            }
        }
        return result;
    }

    private void persistStateChange(MintScheduleState state, MintScheduleItem item, long time) {
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

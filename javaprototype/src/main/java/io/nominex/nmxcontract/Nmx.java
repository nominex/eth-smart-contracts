package io.nominex.nmxcontract;

import java.util.Map;

public class Nmx {

    private Map<DistributionPool, DistributionPoolInfo> poolInfos = null;

    public Nmx() {
        mint();
    }

    public double updateAndGetTotalMinted(DistributionPool pool) {

    }

    private double 

    private void mint() {
        mintPurchased();
        mintFrozen();
        mintOther();
    }

    private void mintOther() {
    }

    private void mintFrozen() {
    }

    private void mintPurchased() {
    }

}

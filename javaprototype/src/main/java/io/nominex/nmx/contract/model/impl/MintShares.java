package io.nominex.nmx.contract.model.impl;

public class MintShares {

    public final double primary;
    public final double bonus;
    public final double team;
    public final double nominex;

    public MintShares(double primary, double bonus, double team, double nominex) {
        this.primary = primary;
        this.bonus = bonus;
        this.team = team;
        this.nominex = nominex;
    }

}

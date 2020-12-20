package io.nominex.nmx.contract.model;

public interface StakingService extends Ownable, Suspendable {

    void stake(double amount);

    void stakeWithPermit(double amount, long deadline, int v, byte[] r, byte[] s);

    void unstake(double amount);

}

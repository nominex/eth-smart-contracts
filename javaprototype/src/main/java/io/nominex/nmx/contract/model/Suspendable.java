package io.nominex.nmx.contract.model;

public interface Suspendable {

    boolean suspended();

    @OnlyOwner
    void suspended(boolean suspended);

}

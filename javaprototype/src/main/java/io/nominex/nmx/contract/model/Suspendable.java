package io.nominex.nmx.contract.model;

public interface Suspendable {

    default boolean suspended() {
        return false;
    }

    @OnlyOwner
    default void suspended(boolean suspended) {
    }

}

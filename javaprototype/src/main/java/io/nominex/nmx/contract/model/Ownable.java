package io.nominex.nmx.contract.model;

public interface Ownable {

    default Address owner() {
        return null;
    }

    default void renounceOwnership() {
    }

    default void transferOwnership() {
    }

}

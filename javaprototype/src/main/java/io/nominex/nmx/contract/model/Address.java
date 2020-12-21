package io.nominex.nmx.contract.model;

public interface Address {

    default boolean transferFrom(Address sender, Address recipient, double amount) {
        return true;
    }

}

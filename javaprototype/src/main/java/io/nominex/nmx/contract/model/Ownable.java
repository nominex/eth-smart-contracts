package io.nominex.nmx.contract.model;

public interface Ownable {

    Address owner();

    void renounceOwnership();

    void transferOwnership();
    
}

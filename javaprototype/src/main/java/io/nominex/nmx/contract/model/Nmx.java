package io.nominex.nmx.contract.model;

public interface Nmx extends Ownable, Address, NmxSupplier {

    @OnlyOwnerOrPoolOwner
    void transferPoolOwnership(MintPool pool, Address newOwner);

}

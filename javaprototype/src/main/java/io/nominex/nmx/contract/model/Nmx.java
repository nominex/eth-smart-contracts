package io.nominex.nmx.contract.model;

public interface Nmx extends Ownable, Stopable {

    @OnlyOwnerOrPoolOwner
    void transferPoolOwnerShip(MintPool pool, Address newOwner);

    double mint(MintPool pool);

    double minted(MintPool pool);

}

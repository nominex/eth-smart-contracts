package io.nominex.nmx.contract.model;

public interface Nmx extends Ownable, Stopable {

    @OnlyOwnerOrPoolOwner
    void transferPoolOwnerShip(DistributionPool pool, Address newOwner);

    double mint(DistributionPool pool);

    double minted(DistributionPool pool);

}

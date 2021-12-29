// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./DoubleSupplyStakingRouter.sol";
import "./FixedRateNmxSupplier.sol";

contract FarmingHelper {
    using ABDKMath64x64 for int128;
    address immutable public router;
    
    constructor(address _router) {
        router = _router;
    }

    function mintScheduleNextTickSupply() public view returns (uint256) {
        StakingRouter r = StakingRouter(router);
        Nmx nmx = Nmx(r.nmx());
        MintSchedule schedule = MintSchedule(nmx.mintSchedule());
        MintScheduleState memory state;
        (state.time, state.itemIndex, state.weekIndex, state.weekStartTime, state.nextTickSupply) = nmx.poolMintStates(uint256(MintPool.PRIMARY));

        (, MintScheduleState memory state2) = schedule.makeProgress(state, uint40(block.timestamp), MintPool.PRIMARY);
        return state2.nextTickSupply;
    }

    function additionalSupplierNextTickSupply() public view returns (uint256) {
        DoubleSupplyStakingRouter r = DoubleSupplyStakingRouter(router);
        FixedRateNmxSupplier additionalSupplier = FixedRateNmxSupplier(r.additionalSupplier());
        if (additionalSupplier.fromTime() > block.timestamp) return 0;
        return additionalSupplier.nmxPerSecond();
    }

    function currentSupplyRate(address reciever) public view returns (uint256) {
        DoubleSupplyStakingRouter r = DoubleSupplyStakingRouter(router);
        int128 share = r.serviceShares(reciever);
        if (share == 0) return 0;
        uint256 nextTickSupply = mintScheduleNextTickSupply() + additionalSupplierNextTickSupply();
        // uint256 nextTickSupply = mintScheduleNextTickSupply();
        return share.mulu(nextTickSupply);        
    }

}

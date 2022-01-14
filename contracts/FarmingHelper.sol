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
        (uint256 nmxSupply,) = schedule.makeProgress(state2, uint40(block.timestamp) + 1, MintPool.PRIMARY);
        return nmxSupply * 3 / 2;
    }

    function additionalSupplierNextTickSupply() public view returns (uint256) {
        DoubleSupplyStakingRouter r = DoubleSupplyStakingRouter(router);
        FixedRateNmxSupplier additionalSupplier = FixedRateNmxSupplier(r.additionalSupplier());
        if (additionalSupplier.fromTime() > block.timestamp) return 0;
        IERC20 nmx = IERC20(r.nmx());
        uint256 balance = nmx.balanceOf(address(additionalSupplier));
        uint256 result = additionalSupplier.nmxPerSecond();
        if (balance < result) result = balance;
        return result;
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

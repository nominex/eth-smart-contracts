pragma solidity >=0.7.0 <0.8.0;

import "../../contracts/StakingService.sol";

contract SetReferrerProxy {

    address private stakingService;

    constructor(address _stakingService) {
        stakingService = _stakingService;
    }

    function setReferrer(address referrer) external {
        StakingService(stakingService).setReferrer(referrer);
    }

}

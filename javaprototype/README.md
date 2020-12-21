Deployment order:
1. Deploy Mint Schedule
2. Deploy Nmx token contract
3. Deploy StakingRouter
4. Set StakingRouter as an pool owner in Nmx
5. Deploy NmxUsdtLpStakingService
6. Set NmxUsdtLpStakingService's share to 1

Add new staking service (reward for new lp tokens) procedure:
1. call checkSupply on every StakingService
2. set new service shares to router

Migrate to new blockchain:
1. call checkSupply on every StakingService
2. set capacityRate to 0 in the schedule

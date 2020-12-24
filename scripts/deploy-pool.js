/*
* run:  truffle exec scripts/deploy-pool.js --tokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7 --network=test
* script will create uniswap pair (if it not already exists) for specified token and nmx and will add staking pool for that pair
* */

const Erc20 = artifacts.require("ERC20");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");
const Nmx = artifacts.require("Nmx");
const {ChainId, Token, TokenAmount, Pair, FACTORY_ADDRESS} = require("@uniswap/sdk");

const {Command} = require('commander');

const program = new Command();

program.option('--tokenAddress <address>', 'token used with nmx to create liquidity pool');
program.parse(process.argv);

module.exports = async (callback) => {

    const toBN = web3.utils.toBN;
    const toWei = web3.utils.toWei;

    try {
        console.log("Creating new staking pool for token " + program.tokenAddress);
        const utils = require("../lib/utils");
        const IUniswapV2Factory = utils.requireContract("@uniswap/v2-core/build/IUniswapV2Factory.json", config);
        const IUniswapV2Router02 = utils.requireContract("@uniswap/v2-periphery/build/IUniswapV2Router02.json", config);

        if (!program.tokenAddress) {
            callback("No adress given for lp token");
            return;
        }
        const stakingRouter = await StakingRouter.deployed();
        const uniswapFactory = await IUniswapV2Factory.at(FACTORY_ADDRESS);
        const nmx = await Nmx.deployed();
        const pairedTkn = await Erc20.at(program.tokenAddress);

        let nmxDecimals = await nmx.decimals();

        const chainId = await web3.eth.getChainId();
        const nmxToken = new Token(chainId, nmx.address, nmxDecimals, await nmx.symbol(), await nmx.name());
        let nmxMultiplier = await toBN(10).pow(nmxDecimals);

        let paireTokenDecimals = await pairedTkn.decimals();
        const pairedToken = new Token(chainId, pairedTkn.address, paireTokenDecimals, await pairedTkn.symbol(), await pairedTkn.name());
        let pairedTokenMultiplier = await toBN(10).pow(paireTokenDecimals);

        const pair = new Pair(new TokenAmount(pairedToken, '1'), new TokenAmount(nmxToken, '1'));
        let pairAddress = await uniswapFactory.getPair.call(pair.token0.address, pair.token1.address);

        if (toBN(pairAddress).isZero()) {
            config.logger.info("Creating uniswap pair");
            const pairCreateResult = await uniswapFactory.createPair(
                pair.token0.address,
                pair.token1.address
            );
            pairAddress = await uniswapFactory.getPair(pair.token0.address, pair.token1.address);
            var accounts = await new Promise((resolve, reject) => {
                web3.eth.getAccounts(function (err, res) {
                    if (!err) resolve(res); else reject(err);
                });
            });
            const secondTknBalance = await pairedTkn.balanceOf.call(accounts[0]);

            const router = await IUniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
            const amountToAddToPool = 10;
            if (secondTknBalance.isZero()) {
                config.logger.info("Converting eth to supplied token");
                const lastBlock = await web3.eth.getBlock("latest");
                const deadline = lastBlock.timestamp + 10 * 1000 * 60;
                const wethAddress = await router.WETH.call();
                [wethAmount,] = await router.getAmountsIn.call(toBN(amountToAddToPool).mul(pairedTokenMultiplier), [wethAddress, pairedTkn.address]);
                const swapResult = await router.swapETHForExactTokens(
                    toBN(amountToAddToPool).mul(pairedTokenMultiplier),
                    [wethAddress, pairedTkn.address],
                    accounts[0],
                    deadline,
                    {value: wethAmount.mul(toBN(102)).div(toBN(100))}
                );
            }

            await nmx.approve(router.address, toWei(toBN(amountToAddToPool)));
            await pairedTkn.approve(router.address, toBN(0));
            await pairedTkn.approve(router.address, toBN(amountToAddToPool).mul(pairedTokenMultiplier));
            const lastBlock = await web3.eth.getBlock("latest");
            const deadline = lastBlock.timestamp + 10 * 1000 * 60;
            config.logger.info("Adding liquidity to pool");
            const addedLiquidity = await router.addLiquidity(
                nmx.address,
                pairedTkn.address,
                toBN(amountToAddToPool).mul(nmxMultiplier),
                toBN(amountToAddToPool).mul(pairedTokenMultiplier),
                toBN(amountToAddToPool).mul(nmxMultiplier),
                toBN(amountToAddToPool).mul(pairedTokenMultiplier),
                accounts[0],
                deadline
            );

        }

        if (toBN(stakingPoolInfo.poolAddress).isZero()) {
            config.logger.info(`Creating staking service for pair ${pairAddress}`);
            const stakingService = new StakingService(nmx, pairAddress, stakingRouter);
            stakingRouter.changeStakingServiceShares([stakingService.address], [1 << 64]);
        }
        stakingPoolInfo = await stakingRouter.stakingPools(pairAddress);
        config.logger.info(`Staking pool for pair ${pairAddress} has address ${stakingPoolInfo.poolAddress}`);
        callback();
    } catch (e) {
        callback(e);
    }
};

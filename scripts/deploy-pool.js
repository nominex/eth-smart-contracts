/*
* run:  truffle exec scripts/deploy-pool.js --tokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7 --network=test
* script will create uniswap pair (if it not already exists) for specified token and nmx and will add staking pool for that pair
* */

const Erc20 = artifacts.require("ERC20");
const StakingRouter = artifacts.require("StakingRouter");
const StakingService = artifacts.require("StakingService");
const Nmx = artifacts.require("Nmx");
const {ChainId, Token, TokenAmount, Pair, FACTORY_ADDRESS} = require("@uniswap/sdk");

const contract = require("@truffle/contract");
const provision = require("@truffle/provisioner");
const {Command} = require('commander');

const program = new Command();

program.option('--tokenAddress <address>', 'token used with nmx to create liquidity pool');
program.parse(process.argv);

function requireContract(path, externalCfg) {
    const contractData = require(path);
    const contractInstance = contract(contractData);
    provision(contractInstance, externalCfg || config);
    return contractInstance;
}

module.exports = async (callback) => {

    const toBN = web3.utils.toBN;
    const toWei = web3.utils.toWei;

    try {
        console.log("Creating new staking pool for token " + program.tokenAddress);
        const IUniswapV2Factory = requireContract("@uniswap/v2-core/build/IUniswapV2Factory.json", config);
        const IUniswapV2Router02 = requireContract("@uniswap/v2-periphery/build/IUniswapV2Router02.json", config);

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
            const amountUsdt = 10000;
            const amountNMX = 100000;
            if (secondTknBalance.isZero()) {
                config.logger.info("Converting eth to supplied token");
                const lastBlock = await web3.eth.getBlock("latest");
                const deadline = lastBlock.timestamp + 10 * 1000 * 60;
                const wethAddress = await router.WETH.call();
                [wethAmount,] = await router.getAmountsIn.call(toBN(amountUsdt).mul(pairedTokenMultiplier), [wethAddress, pairedTkn.address]);
                const swapResult = await router.swapETHForExactTokens(
                    toBN(amountUsdt).mul(pairedTokenMultiplier),
                    [wethAddress, pairedTkn.address],
                    accounts[0],
                    deadline,
                    {value: wethAmount.mul(toBN(102)).div(toBN(100))}
                );
            }

            await nmx.approve(router.address, toWei(toBN(amountNMX)));
            await pairedTkn.approve(router.address, toBN(0));
            await pairedTkn.approve(router.address, toBN(amountUsdt).mul(pairedTokenMultiplier));
            const lastBlock = await web3.eth.getBlock("latest");
            const deadline = lastBlock.timestamp + 10 * 1000 * 60;
            config.logger.info("Adding liquidity to pool");
            const addedLiquidity = await router.addLiquidity(
                nmx.address,
                pairedTkn.address,
                toBN(amountNMX).mul(nmxMultiplier),
                toBN(amountUsdt).mul(pairedTokenMultiplier),
                toBN(amountNMX).mul(nmxMultiplier),
                toBN(amountUsdt).mul(pairedTokenMultiplier),
                accounts[0],
                deadline
            );

        }


        let stakingService = undefined;

        for (let i = 0; true; ++i) {
            let activeService;
            try {
                activeService = await stakingRouter.activeServices(i);
            } catch (e) {
                break;
            }
            stakingService = await StakingService.at(activeService);
            if (await stakingService.stakingToken() === pairAddress) {
                break;
            }
        }
        if (!stakingService) {
            config.logger.info(`Creating staking service for pair ${pairAddress}`);
            stakingService = await StakingService.new(nmx.address, pairAddress, stakingRouter.address);
            /*FIXME: add services that were created before*/
            await stakingRouter.changeStakingServiceShares([stakingService.address], [toBN(1).shln(64)]);
        }
        config.logger.info(`Staking service for pair ${pairAddress} has address ${stakingService.address}`);
        callback();
    } catch (e) {
        callback(e);
    }
};


/*
* run:  truffle exec scripts/deploy-pool.js --tokenAddress=0xdAC17F958D2ee523a2206206994597C13D831ec7 --network=test
* script will create uniswap pair (if it not already exists) for specified token and nmx and will add staking pool for that pair
* */

const Erc20 = artifacts.require("ERC20");
const StakingPoolManager = artifacts.require("StakingPoolManager");
const Nmx = artifacts.require("Nmx");
const {ChainId, Token, TokenAmount, Pair, FACTORY_ADDRESS} = require("@uniswap/sdk");

const { Command } = require('commander');

const program = new Command();

program.option('--tokenAddress <address>', 'token used with nmx to create liquidity pool')
program.parse(process.argv);

module.exports = async (callback) => {

  try {
    const utils = require("../lib/utils");
    const IUniswapV2Factory = utils.requireContract("@uniswap/v2-core/build/IUniswapV2Factory.json", config);

    if (!program.tokenAddress) {
      callback("No adress given for lp token");
      return;
    }
    const poolManager = await StakingPoolManager.deployed();
    const uniswapFactory = await IUniswapV2Factory.at(FACTORY_ADDRESS);
    const nmx = await Nmx.deployed();
    const secondTkn = await Erc20.at(program.tokenAddress);

    /* TODO: get chain id from web3*/
    const pairedToken = new Token(ChainId.MAINNET, secondTkn.address, await secondTkn.decimals(), await secondTkn.symbol(), await secondTkn.name());
    const nmxToken = new Token(ChainId.MAINNET, nmx.address, await nmx.decimals(), await nmx.symbol(), await nmx.name());

    const pair = new Pair(new TokenAmount(pairedToken, '1'), new TokenAmount(nmxToken, '1'));
    let pairAddress = await uniswapFactory.getPair.call(pair.token0.address, pair.token1.address);

    if (web3.utils.toBN(pairAddress).isZero()) {
      config.logger.info("Creating uniswap pair");
      const pairCreateResult = await uniswapFactory.createPair(
        pair.token0.address,
        pair.token1.address
      );
      pairAddress = await uniswapFactory.getPair(pair.token0.address, pair.token1.address);

      const secondTknBalance = await secondTkn.balanceOf.call(accounts[0]);

      const router = await IUniswapV2Router02.at(networkCfg.uniswapRouter02);
      if (secondTknBalance.isZero()) {
        config.logger.info("Converting eth to supplied token");
        const lastBlock = await web3.eth.getBlock("latest");
        const deadline = lastBlock.timestamp + 10 * 1000 * 60;
        const wethAddress = await router.WETH.call();
        [wethAmount, ] = await router.getAmountsIn.call(10e6, [wethAddress, secondTkn.address]);
        const swapResult = await router.swapETHForExactTokens(
          10e6,
          [wethAddress, secondTkn.address],
          accounts[0],
          deadline,
          {value: wethAmount.mul(Web3.utils.toBN(105)).div(Web3.utils.toBN(100))}
        );
      }

      await nmx.approve(router.address, Web3.utils.toBN(10e18));
      await secondTkn.approve(router.address, Web3.utils.toBN(0));
      await secondTkn.approve(router.address, Web3.utils.toBN(10e6));
      const lastBlock = await web3.eth.getBlock("latest");
      const deadline = lastBlock.timestamp + 10 * 1000 * 60;
      config.logger.info("Adding liquidity to pool");
      const addedLiquidity = await router.addLiquidity(
        nmx.address,
        secondTkn.address,
        Web3.utils.toBN(10e18),
        Web3.utils.toBN(10e6),
        Web3.utils.toBN(10e18),
        Web3.utils.toBN(10e6),
        accounts[0],
        deadline
      );

    };

    let stakingPoolInfo = await poolManager.stakingPools(pairAddress);
    if (web3.utils.toBN(stakingPoolInfo.poolAddress).isZero()) {
      config.logger.info(`Creating staking pool for pair ${pairAddress}`);
      await poolManager.addPool(pairAddress);
    }
    stakingPoolInfo = await poolManager.stakingPools(pairAddress);
    config.logger.info(`Stking pool for pair ${pairAddress} has address ${stakingPoolInfo.poolAddress}`);
  } catch (e) {
    callback(e);
  }
};

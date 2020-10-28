const utils = require("../lib/utils");
const Web3 = require("web3");
const IErc20 = artifacts.require("IERC20");
const IUniswapV2Router02 = utils.requireContract("@uniswap/v2-periphery/build/IUniswapV2Router02.json");
const IUniswapV2Factory = utils.requireContract("@uniswap/v2-core/build/IUniswapV2Factory.json");

// import { ChainId, Token, TokenAmount, Pair } from '@uniswap/sdk'
const uniswapSdk = require('@uniswap/sdk');
const ChainId = uniswapSdk.ChainId;
const Token = uniswapSdk.Token;
const TokenAmount = uniswapSdk.TokenAmount;
const Pair = uniswapSdk.Pair;

const Nmx = artifacts.require("Nmx");
const NmxLpStaking = artifacts.require("NmxLpStaking");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Nmx);
  const nmx = await Nmx.deployed();
  const networkCfg = deployer.networks[network];
  const uniswapFactory = await IUniswapV2Factory.at(networkCfg.uniswapFactory); 

  const usdt = await IErc20.at(networkCfg.usdt);

  const usdtToken = new Token(ChainId.MAINNET, usdt.address, await usdt.decimals(), await usdt.symbol(), await usdt.name());
  const nmxToken = new Token(ChainId.MAINNET, nmx.address, await nmx.decimals(), await nmx.symbol(), await nmx.name());

  const pair = new Pair(new TokenAmount(usdtToken, '1'), new TokenAmount(nmxToken, '1'))

  var createdPairAddress = await uniswapFactory.getPair.call(pair.token0.address, pair.token1.address);
  if (Web3.utils.toBN(createdPairAddress).isZero()) {
    config.logger.info("Creating uniswap pair");
    const pairCreateResult = await uniswapFactory.createPair(
      pair.token0.address,
      pair.token1.address
    );
    createdPairAddress = await uniswapFactory.getPair(pair.token0.address, pair.token1.address);

    const usdtBalance = await usdt.balanceOf.call(accounts[0]);

    const router = await IUniswapV2Router02.at(networkCfg.uniswapRouter02);
    if (usdtBalance.isZero()) {
      config.logger.info("Converting eth to usdt");
      const lastBlock = await web3.eth.getBlock("latest");
      const deadline = lastBlock.timestamp + 10 * 1000 * 60;
      const wethAddress = await router.WETH.call();
      [wethAmount, ] = await router.getAmountsIn.call(10e6, [wethAddress, usdt.address]);
      const swapResult = await router.swapETHForExactTokens(
        10e6, 
        [wethAddress, usdt.address], 
        accounts[0], 
        deadline,
        {value: wethAmount.mul(Web3.utils.toBN(105)).div(Web3.utils.toBN(100))}
      );
    }

    await nmx.approve(router.address, Web3.utils.toBN(10e18));
    await usdt.approve(router.address, Web3.utils.toBN(0));
    await usdt.approve(router.address, Web3.utils.toBN(10e6));
    const lastBlock = await web3.eth.getBlock("latest");
    const deadline = lastBlock.timestamp + 10 * 1000 * 60;
    config.logger.info("Adding liquidity to pool");
    const addedLiquidity = await router.addLiquidity(
      nmx.address,
      usdt.address,
      Web3.utils.toBN(10e18),
      Web3.utils.toBN(10e6),
      Web3.utils.toBN(10e18),
      Web3.utils.toBN(10e6),
      accounts[0],
      deadline
    );

    // console.dir(addedLiquidity);

  };

  await deployer.deploy(NmxLpStaking, pair.liquidityToken.address, Nmx.address, accounts[0]);
  const nmxLpStaking = await NmxLpStaking.deployed();
  await nmx.approve(nmxLpStaking.address, Web3.utils.toBN(1e18).mul(Web3.utils.toBN(100000000)));
};

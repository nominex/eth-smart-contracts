const getAssertBN = function (maxDiff = web3.utils.toBN(0)) {
  maxDiff = web3.utils.isBN(maxDiff) ? maxDiff : web3.utils.toBN(maxDiff);
  return (actual, expected, message) => {
    expected = web3.utils.isBN(expected)
      ? expected
      : web3.utils.toBN(expected * 10 ** 18);
    let diff = actual.sub(expected).abs();
    assert(
      diff.lte(maxDiff),
      `${message} expected=${expected.toString()} actual=${actual.toString()} diff=${diff.toString()} maxDiff=${maxDiff}`
    );
  };
};

const getComparesEqualBN = function (maxDiff = 0) {
  maxDiff = web3.utils.isBN(maxDiff) ? maxDiff : web3.utils.toBN(maxDiff);
  return (first, second) => {
    first = web3.utils.isBN(first)
        ? first
        : web3.utils.toBN(first * 10 ** 18);
    second = web3.utils.isBN(second)
        ? second
        : web3.utils.toBN(second * 10 ** 18);
    let diff = first.sub(second).abs();
    return diff.lte(maxDiff);
  }
};


module.exports = {
  rpcCommand: (command, params = []) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send(
        { jsonrpc: "2.0", method: command, params: params },
        (err, result) => {
          if (!err) {
            resolve(result.result);
          } else {
            reject(err);
          }
        }
      );
    });
  },

  signData: async function (owner, typeData) {
    return new Promise((resolve, reject) => {
      const request = {
        id: 1,
        method: "eth_signTypedData",
        params: [owner, typeData],
        from: owner,
      };
      web3.currentProvider.send(request, (errorMsg, response) => {
        if (errorMsg) reject(errorMsg);
        const r = response.result.slice(0, 66);
        const s = "0x" + response.result.slice(66, 130);
        const v = Number("0x" + response.result.slice(130, 132));
        resolve({ v, r, s });
      });
    });
  },

  getAssertBN,

  getComparesEqualBN,

  ZERO: web3.utils.toBN(0),
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
};

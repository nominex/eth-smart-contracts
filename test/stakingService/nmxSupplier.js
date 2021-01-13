const StakingService = artifacts.require("StakingService");
const { rpcCommand } = require("../../lib/utils.js");
const { step } = require("mocha-steps");

contract('StakingService; Group: NmxSupplier', (accounts) => {
    let stakingService;
    let snapshotId;

    let errorMessage = "";

    before(async () => {
        stakingService = await StakingService.new(accounts[1], accounts[2], accounts[3]);
    });

    function makeSuite(name, tests) {
        describe(`Test: ${name}`, function () {
            before(async () => {
                snapshotId = await rpcCommand("evm_snapshot");
            });
            tests();
            after(async () => {
                await rpcCommand("evm_revert", [snapshotId]);
                errorMessage = "";
            });
        });
    }

    makeSuite('Owner can change nmxSupplier', () => {
        checkSupplier(accounts[3]);
        checkOwner(accounts[0]);
        changeSupplier(accounts[4], accounts[0]);
        errorNotOccurred();
        checkSupplier(accounts[4]);
    });

    makeSuite('Not owner can\'t change nmxSupplier', () => {
        checkSupplier(accounts[3]);
        checkNotOwner(accounts[5]);
        changeSupplier(accounts[4], accounts[5]);
        checkErrorOccurred("Ownable: caller is not the owner");
        checkSupplier(accounts[3]);
    });

    makeSuite('Owner can\'t change nmxSupplier to same address', () => {
        checkSupplier(accounts[3]);
        checkOwner(accounts[0]);
        changeSupplier(accounts[3], accounts[0]);
        checkErrorOccurred("NMXSTKSRV: new nmx supplier must differs from the old one");
        checkSupplier(accounts[3]);
    });

    function checkSupplier(expectedAddress) {
        step(`Check that current nmxSupplier is ${expectedAddress}`, async () => {
            await assert.equal(expectedAddress, await stakingService.nmxSupplier(), "nmxSupplier");
        });
    }

    function changeSupplier(newSupplier, fromAddress) {
        step(`Change nmxSupplier by ${fromAddress} to ${newSupplier}`, async () => {
            try {
                await stakingService.changeNmxSupplier(newSupplier, {from: fromAddress});
            } catch (error) {
                errorMessage = error.message;
            }
        });
    }

    function checkErrorOccurred(expectedMessage) {
        step(`Check that error occurred with message "${expectedMessage}"`, async () => {
            await assert(errorMessage.includes(expectedMessage), errorMessage);
        });
    }

    function errorNotOccurred() {
        step(`Check that error not occurred`, async () => {
            await assert.equal('', errorMessage);
        });
    }

    function checkOwner(address) {
        step(`Check that owner is ${accounts[0]}`, async () => {
            await assert.equal(address, await stakingService.owner(), "stakingService owner");
        });
    }

    function checkNotOwner(address) {
        step(`Check that ${accounts[0]} is not owner` , async () => {
            await assert.notEqual(address, await stakingService.owner(), "stakingService owner");
        });
    }

});

const fs = require('fs');

const makeDirIfDoesntExist = (dirName) => {
    if (!fs.existsSync(dirName)) {
        const pathParts = dirName.split('/');

        pathParts.reduce((acc, pathPart) => {
            if (!acc) {
                return pathPart;
            }

            const dir = `${acc}/${pathPart}`;

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            return dir;
        }, '');
    }
};

const abiFolder = './dist/abi';
const contractFolder = './dist/contracts';

const processFile = (sourceFolder, fileName) => {
    if (!fileName.includes('.json')) {
        return;
    }

    const contract = require(`${sourceFolder}/${fileName}`);

    if (contract && contract.abi) {
        console.log(`Processing ${fileName}...`);

        const abiJson = JSON.stringify(contract.abi, null, 2);
        const abiFileName = `${abiFolder}/${fileName}`;

        const contractJson = JSON.stringify(contract, null, 2);
        const contractFileName = `${contractFolder}/${fileName}`;

        fs.writeFile(abiFileName, abiJson, (err) => {
            if (err) {
                return console.log(err);
            }
        });

        fs.writeFile(contractFileName, contractJson, (err) => {
            if (err) {
                return console.log(err);
            }
        });
    }
}

const buildFolder = './build/contracts';
const extraFiles = [{
    sourceFolder: './node_modules/@uniswap/v2-periphery/build',
    fileName: 'IUniswapV2Router02.json'
}];

makeDirIfDoesntExist(abiFolder);
makeDirIfDoesntExist(contractFolder);

fs.readdir(buildFolder, (err, files) => {
    if (!files || !files.length) {
        console.log('Compile contracts first!');
        return;
    }
    files.forEach((fileName) => processFile(buildFolder, fileName));
});

extraFiles.forEach(({ sourceFolder, fileName }) => processFile(sourceFolder, fileName));

console.log('Completed.');

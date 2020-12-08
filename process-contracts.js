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

const buildFolder = './build/contracts';
const abiFolder = './dist/abi';
const contractFolder = './dist/contracts';

fs.readdir(buildFolder, (err, files) => {
    if (!files || !files.length) {
        console.log('Compile contracts first!');
        return;
    }

    makeDirIfDoesntExist(abiFolder);
    makeDirIfDoesntExist(contractFolder);

    files.forEach(fileName => {
        if (!fileName.includes('.json')) {
            return;
        }

        const contract = require(`${buildFolder}/${fileName}`);

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
    });

    console.log('Completed.');
});


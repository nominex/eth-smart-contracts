const fs = require('fs');

const buildFolder = './build/contracts';
const distFolder = './dist/contracts';

fs.readdir(buildFolder, (err, files) => {
    if (!files || !files.length) {
        console.log('Compile contracts first!');
        return;
    }

    if (!fs.existsSync(distFolder)) {
        const pathParts = distFolder.split('/');

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

    files.forEach(fileName => {
        if (!fileName.includes('.json')) {
            return;
        }

        contract = require(`${buildFolder}/${fileName}`);
        if (contract && contract.abi) {
            console.log(`Processing ${fileName}...`);

            const data = JSON.stringify(contract.abi, null, 2);
            const destFileName = `${distFolder}/${fileName.split('.json')[0]}-abi.json`;

            fs.writeFile(destFileName, data, (err) => {
                if (err) {
                    return console.log(err);
                }
            });
        }
    });

    console.log('Completed.');
});


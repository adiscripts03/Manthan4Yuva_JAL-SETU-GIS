const solc = require('solc');
const fs = require('fs');
const path = require('path');

const contractPath = path.join(__dirname, 'blockchain/ProofLedger.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'ProofLedger.sol': { content: source } },
  settings: {
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    optimizer: { enabled: true, runs: 200 }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  for (const e of output.errors) { 
    console.log(e.formattedMessage); 
    if (e.severity === 'error') hasError = true; 
  }
  if (hasError) process.exit(1);
}

const c = output.contracts['ProofLedger.sol']['ProofLedger'];

fs.writeFileSync(path.join(__dirname, 'blockchain/ProofLedger.abi.json'), JSON.stringify(c.abi, null, 2));
fs.writeFileSync(path.join(__dirname, 'blockchain/ProofLedger.bytecode.txt'), '0x' + c.evm.bytecode.object);

console.log('Compiled OK');

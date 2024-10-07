import { exec } from 'child_process';
import path from 'path';

// List of scripts to run sequentially
const scriptsToRun = [
  '0-onboard+polyx.js',
  '1-create-nft-collection.js',
  '2-issue-nfts.js',
  '3-create-asset.js',
  '4-create-stablecoin.js',
  '5-create-portfolio.js',
  '6-create-venues.js',
  '7-fund-demo-identities.js',
  '8-add-rules.js',
  '9-add-claims.js',
  '10-create-settlement.js',
];

const runScriptsSequentially = (scripts: string[], index = 0): void => {
  if (index >= scripts.length) {
    console.log('All scripts executed successfully.');
    return;
  }

  const script = scripts[index];
  const scriptPath = path.join(__dirname, script);

  console.log(`Running script: ${script}`);

  // Execute the script and capture stdout and stderr
  const process = exec(`node ${scriptPath}`);

  process.stdout?.on('data', (data) => {
    console.log(`[${script}] stdout: ${data}`);
  });

  process.stderr?.on('data', (data) => {
    console.error(`[${script}] stderr: ${data}`);
  });

  process.on('close', (code) => {
    if (code !== 0) {
      console.error(`[${script}] exited with error code ${code}`);
    } else {
      console.log(`[${script}] completed successfully.`);
    }

    // Run the next script in the sequence
    runScriptsSequentially(scriptsToRun, index + 1);
  });
};

// Start running the scripts
runScriptsSequentially(scriptsToRun);

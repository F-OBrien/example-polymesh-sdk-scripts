import { exec } from 'child_process';
import path from 'path';
import { disconnectSdk } from './connect';

// List of scripts to run sequentially
const scriptsToRun = [
  '0-onboard+polyx.js',
  '1-create-nft-collection.js',
  '2-issue-nfts.js',
  '3-create-asset.js',
  '4-create-stablecoin.js',
  '5-create-portfolio.js',
  '6-create-venue.js',
  '7-fund-demo-identities.js',
  '8-add-rules.js',
  '9-add-claims.js',
  '10-create-settlement.js',
];

const runScriptsSequentially = (scripts: string[], index = 0): void => {
  if (index >= scripts.length) {
    console.log('All scripts executed successfully.');
    disconnectSdk().catch(console.error);
    return;
  }

  const script = scripts[index];
  const scriptPath = path.join(__dirname, script);

  console.log(`Running script: ${script}`);

  // Execute the script and capture stdout and stderr
  const childProcess = exec(`node ${scriptPath}`);

  childProcess.stdout?.on('data', (data) => {
    console.log(`[${script}] stdout: ${data}`);
  });

  childProcess.stderr?.on('data', (data) => {
    console.error(`[${script}] stderr: ${data}`);
  });

  childProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`[${script}] exited with error code ${code}`);
      process.exit(code); // Exit the main process if there's an error
    } else {
      console.log(`[${script}] completed successfully.`);
      // Run the next script in the sequence
      runScriptsSequentially(scriptsToRun, index + 1);
    }
  });
};

// Start running the scripts
runScriptsSequentially(scriptsToRun);

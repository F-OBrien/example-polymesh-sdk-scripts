import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { Balance } from '@polymeshassociation/polymesh-sdk/types';
import { handleTxStatusChange } from './helpers';

// Define the mnemonic and derivation path for the test keys
// IMPORTANT: The associated keys must first be onboarded to the target chain before
// they can receive POLYX and transact. To onboard testnet keys visit to https://onboarding.polymesh.live/
const MNEMONIC =
  'crash pause between write pride deliver moon mountain chief grocery steak draw';
const derivationPath1 = '//key1'; // address: 5E6vASEuLzti9yUBfKKPrStaE3dmq1S67PMZLMzdKYxBzS71
const derivationPath2 = '//key2'; // address: 5DsyrPQViUKG8wHHKaf7tXL8kxy7pgMakaDbJue1nSpBzsbD
const nodeUrl = 'wss://staging-rpc.polymesh.dev';

// Function to print the balance details
const printBalance = (balance: Balance) => {
  console.log(`- Free: ${balance?.free.toString()} POLYX`);
  console.log(`- Locked: ${balance?.locked.toString()} POLYX`);
  console.log(`- Total: ${balance?.total.toString()} POLYX`);
};

const main = async () => {
  try {
    // Create a local signing manager with two accounts
    const signingManager = await LocalSigningManager.create({
      accounts: [
        {
          mnemonic: MNEMONIC,
          derivationPath: derivationPath1,
        },
        {
          mnemonic: MNEMONIC,
          derivationPath: derivationPath2,
        },
      ],
    });

    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl,
      signingManager,
      polkadot: { noInitWarn: true },
    });

    // Retrieve network properties and log successful connection
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name, '🎉');

    // Retrieve accounts and check if they meet the required Compliance Due Diligence (CDD)
    const signingKeys = await signingManager.getAccounts();

    // Display the balances for each key in the signing manager
    signingKeys.forEach(async (key) => {
      const account = await sdk.accountManagement.getAccount({
        address: key,
      });
      console.log(`\n${key} Balance:`);
      printBalance(await account.getBalance());
    });

    // Prepare a POLYX transfer with memo transaction
    const amount = new BigNumber(10);
    const from = signingKeys[0];
    const to = signingKeys[1];

    const polyxTransferTx = await sdk.network.transferPolyx(
      {
        amount,
        to,
        memo: 'I sent some POLYX',
      },
      { signingAccount: from },
    );

    console.log(`\nTransferring ${amount} POLYX from ${from} to ${to}`);

    // Subscribe to transaction status changes and handle status changes
    const unsub = polyxTransferTx.onStatusChange(handleTxStatusChange);

    try {
      // Execute the PolyX transfer transaction
      await polyxTransferTx.run();
    } catch (error) {
      console.log('Transaction Error:', (error as Error).message);
    } finally {
      // Unsubscribe from transaction status changes
      unsub();
    }

    console.log(JSON.stringify(polyxTransferTx.receipt?.events, undefined, 2));
    // Display updated balances after the transaction
    signingKeys.forEach(async (key) => {
      const account = await sdk.accountManagement.getAccount({
        address: key,
      });
      console.log(`\n${key} Balance:`);
      printBalance(await account.getBalance());
    });

    // Disconnect from Polymesh and exit the process
    console.log('\nDisconnecting');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

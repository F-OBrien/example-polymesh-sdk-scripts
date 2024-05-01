import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  Identity,
  Instruction,
  UnsubCallback,
} from '@polymeshassociation/polymesh-sdk/types';
import fs from 'fs';
import { handleTxStatusChange } from './helpers';

interface DistributionInfo {
  identity: string;
  nftIds: BigNumber[];
}

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const NODE_URL = 'ws://localhost:9944/';

// Ticker of collection NFT's will be issued from
const TICKER = 'NFT0001';

// Set the location of the .csv file containing the NFT metadata information
const CSV_FILE_PATH = 'sample-distributions.csv';

// Set the venue ID for the distributions
const VENUE_ID = 1;

// Set the maximum number of NFT's to create in a single batch transaction
const MAX_BATCH_SIZE = 100;

async function parseCsv(csvFilePath: string): Promise<DistributionInfo[]> {
  try {
    const fileContent: string = await fs.promises.readFile(
      csvFilePath,
      'utf-8',
    );
    const rows: string[] = fileContent.trim().split('\n');

    const distributions = rows.map((row) => {
      const values: string[] = row
        .trim()
        .split(',')
        .map((value) => value.trim());

      const identity = values[0];

      const nftIds = values.slice(1).map((nftId) => new BigNumber(nftId));

      return { identity, nftIds };
    });

    return distributions;
  } catch (error) {
    throw new Error(`Error parsing CSV file: ${(error as Error).message}`);
  }
}

async function connectToPolymesh(): Promise<Polymesh> {
  // Create a local signing manager with one account
  const signingManager = await LocalSigningManager.create({
    accounts: [{ mnemonic: MNEMONIC }],
  });

  // Connect to the Polymesh blockchain using the SDK
  const sdk = await Polymesh.connect({
    nodeUrl: NODE_URL,
    signingManager,
    polkadot: { noInitWarn: true },
  });

  return sdk;
}

async function getSigningAccountNonce(sdk: Polymesh): Promise<BigNumber> {
  // Get signing account nonce
  const signingAccount = sdk.accountManagement.getSigningAccount();
  if (!signingAccount) {
    throw new Error('Signing account not found.');
  }
  const nonce = await signingAccount.getCurrentNonce();
  return nonce;
}

async function distributeNftsInBatches(
  sdk: Polymesh,
  senderIdentity: Identity,
  ticker: string,
  distributions: DistributionInfo[],
): Promise<void> {
  const unsubs: UnsubCallback[] = [];

  const currentNonce = await getSigningAccountNonce(sdk);

  const venue = await sdk.settlements.getVenue({
    id: new BigNumber(VENUE_ID),
  });

  const runPromises: (Promise<Instruction> | Promise<Instruction[]>)[] = [];
  const maxIterations = Math.ceil(distributions.length / MAX_BATCH_SIZE);
  // Split NFT's into batches. We assign a nonce so transactions can run concurrently
  for (let i = 0; i < maxIterations; i += 1) {
    const distributionBatch = distributions.slice(
      i * MAX_BATCH_SIZE,
      i * MAX_BATCH_SIZE + MAX_BATCH_SIZE,
    );

    const distributeTransactionPromises = distributionBatch.map(
      ({ identity, nftIds }) => {
        return venue.addInstruction(
          {
            legs: [
              {
                from: senderIdentity,
                to: identity,
                asset: ticker,
                nfts: nftIds,
              },
            ],
          },
          { nonce: currentNonce.plus(i) },
        );
      },
    );
    // eslint-disable-next-line no-await-in-loop
    const transactions = await Promise.all(distributeTransactionPromises);
    if (transactions.length === 1) {
      const unsub = transactions[0].onStatusChange(handleTxStatusChange);
      unsubs.push(unsub);
      // eslint-disable-next-line no-await-in-loop
      runPromises.push(transactions[0].run());
    } else {
      // eslint-disable-next-line no-await-in-loop
      const batchTransaction = await sdk.createTransactionBatch(
        { transactions },
        { nonce: currentNonce.plus(i) },
      );
      const unsub = batchTransaction.onStatusChange(handleTxStatusChange);
      unsubs.push(unsub);
      // eslint-disable-next-line no-await-in-loop
      runPromises.push(batchTransaction.run());
    }
  }

  await Promise.all(runPromises);
  unsubs.forEach((unsub) => unsub());
}

const main = async () => {
  try {
    console.log(`Reading NFT distribution information from ${CSV_FILE_PATH}`);
    const distributions: DistributionInfo[] = await parseCsv(CSV_FILE_PATH);

    console.log('Connecting to Polymesh');
    const sdk = await connectToPolymesh();

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name);

    const senderIdentity = await sdk.getSigningIdentity();
    if (!senderIdentity) {
      throw new Error('Sender identity not found.');
    }

    await distributeNftsInBatches(sdk, senderIdentity, TICKER, distributions);

    // Disconnect from Polymesh
    console.log('\nDisconnecting');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

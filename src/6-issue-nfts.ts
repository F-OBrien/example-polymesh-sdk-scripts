import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  CollectionKey,
  Nft,
  NftCollection,
  NftMetadataInput,
  UnsubCallback,
} from '@polymeshassociation/polymesh-sdk/types';
import fs from 'fs';
import { handleTxStatusChange } from './helpers';

interface NftMetadataValue {
  name: string;
  value: string;
}
type NftToIssue = NftMetadataValue[];

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const NODE_URL = 'ws://localhost:9944/';

// Ticker of collection NFT's will be issued from
const TICKER = 'NFT0002';

// Set the location of the .csv file containing the NFT metadata information
const CSV_FILE_PATH = 'sample-metadata-values.csv';

// Set the maximum number of NFT's to create in a single batch transaction
const MAX_BATCH_SIZE = 100;

async function parseCsv(csvFilePath: string): Promise<NftToIssue[]> {
  try {
    const fileContent: string = await fs.promises.readFile(
      csvFilePath,
      'utf-8',
    );
    const rows: string[] = fileContent.trim().split('\n');
    const headers: string[] = rows
      .shift()!
      .trim()
      .split(',')
      .map((header) => header.trim());

    const nftsToIssue: NftToIssue[] = rows.map((row) => {
      const values: string[] = row
        .trim()
        .split(',')
        .map((value) => value.trim());
      return headers.map((name, index) => ({ name, value: values[index] }));
    });

    return nftsToIssue;
  } catch (error) {
    throw new Error(`Error parsing CSV file: ${(error as Error).message}`);
  }
}

function validateCollectionKeyValues(
  collectionKeys: CollectionKey[],
  nftMetadataValues: { name: string; value: string }[],
) {
  const RequiredKeyNames = collectionKeys.map((key) => key.name);

  // Check if all required keys are included
  const missingKeys = RequiredKeyNames.filter(
    (name) => !nftMetadataValues.some((kv) => kv.name === name),
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing values for required collection keys: ${missingKeys.join(', ')}`,
    );
  }

  // Check if there are extra keys included
  const extraKeys = nftMetadataValues.filter(
    (kv) => !RequiredKeyNames.includes(kv.name),
  );
  if (extraKeys.length > 0) {
    throw new Error(
      `These keys are not part of this collection: ${extraKeys
        .map((kv) => kv.name)
        .join(', ')}`,
    );
  }
}

function prepareNftMetadata(
  collectionKeys: CollectionKey[],
  nftMetadataValues: { name: string; value: string }[],
): NftMetadataInput[] {
  validateCollectionKeyValues(collectionKeys, nftMetadataValues);

  return collectionKeys.map(({ id, name, type }) => {
    const keyValue = nftMetadataValues.find((kv) => kv.name === name);
    if (!keyValue) {
      throw new Error(`Value not found for collection key: ${name}`);
    }
    return { id, type, value: keyValue.value };
  });
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

async function issueNftsInBatches(
  sdk: Polymesh,
  nftCollection: NftCollection,
  preparedMetadata: NftMetadataInput[][],
): Promise<void> {
  const unsubs: UnsubCallback[] = [];

  const currentNonce = await getSigningAccountNonce(sdk);

  const runPromises: (Promise<Nft> | Promise<Nft[]>)[] = [];
  const maxIterations = Math.ceil(preparedMetadata.length / MAX_BATCH_SIZE);
  // Split NFT's into batches. We assign a nonce so transactions can run concurrently
  for (let i = 0; i < maxIterations; i += 1) {
    const nftBatch = preparedMetadata.slice(
      i * MAX_BATCH_SIZE,
      i * MAX_BATCH_SIZE + MAX_BATCH_SIZE,
    );

    const issueTransactionPromises = nftBatch.map((nftMetadata) => {
      return nftCollection.issue(
        { metadata: nftMetadata },
        { nonce: currentNonce.plus(i) },
      );
    });
    // eslint-disable-next-line no-await-in-loop
    const transactions = await Promise.all(issueTransactionPromises);
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
    console.log(`Reading NFT metadata from ${CSV_FILE_PATH}`);
    const nftsToIssue: NftToIssue[] = await parseCsv(CSV_FILE_PATH);

    console.log('Connecting to Polymesh');
    const sdk = await connectToPolymesh();

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name);

    const nftCollection = await sdk.assets.getNftCollection({ ticker: TICKER });

    const collectionKeys = await nftCollection.collectionKeys();

    const preparedMetadata = nftsToIssue.map((nftPropertyValues) => {
      const nftMetadata = prepareNftMetadata(collectionKeys, nftPropertyValues);
      return nftMetadata;
    });

    await issueNftsInBatches(sdk, nftCollection, preparedMetadata);

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

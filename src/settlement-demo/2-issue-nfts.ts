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
import { parse } from 'csv-parse';
import { handleTxStatusChange } from '../helpers';
import { CSV_FILE_PATH, MAX_BATCH_SIZE } from './scriptInputs/nftInputs';
import {
  NODE_URL,
  ISSUER_MNEMONIC,
  ASSET_IDS_PATH,
  NFT_COLLECTION_ASSET_KEY,
} from './scriptInputs/common';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

interface NftMetadataValue {
  name: string;
  value: string;
}
type NftToIssue = NftMetadataValue[];

async function parseCsv(csvFilePath: string): Promise<NftToIssue[]> {
  return new Promise((resolve, reject) => {
    const nftsToIssue: NftToIssue[] = [];
    const parser = fs.createReadStream(csvFilePath).pipe(
      parse({
        columns: true,
        trim: true,
        skip_empty_lines: true,
        quote: '"',
      }),
    );

    parser.on('readable', () => {
      for (
        let record = parser.read();
        record !== null;
        record = parser.read()
      ) {
        const nftMetadata = Object.entries(record).map(([name, value]) => ({
          name: name.trim(),
          value: (value as string).trim(),
        }));
        nftsToIssue.push(nftMetadata);
      }
    });

    parser.on('error', (error) => {
      reject(new Error(`Error parsing CSV file: ${error.message}`));
    });

    parser.on('end', () => {
      resolve(nftsToIssue);
    });
  });
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
    accounts: [{ mnemonic: ISSUER_MNEMONIC }],
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
    const assetId = assetIds[NFT_COLLECTION_ASSET_KEY];

    console.log(`Reading NFT metadata from ${CSV_FILE_PATH}`);
    const nftsToIssue: NftToIssue[] = await parseCsv(CSV_FILE_PATH);

    console.log('Connecting to Polymesh');
    const sdk = await connectToPolymesh();

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name);

    const nftCollection = await sdk.assets.getNftCollection({
      assetId,
    });

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
    console.error(error);
    process.exit(1);
  }
};

main();

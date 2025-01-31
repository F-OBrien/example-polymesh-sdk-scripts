import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  Asset,
  GenericPolymeshTransaction,
  MetadataEntry,
  MetadataType,
} from '@polymeshassociation/polymesh-sdk/types';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import {
  TICKER,
  NFT_TYPE,
  COLLECTION_NAME,
  COLLECTION_KEYS,
  INCLUDE_TOKEN_URI_AS_COLLECTION_KEY,
  INCLUDE_IMAGE_URI_AS_COLLECTION_KEY,
  BASE_IMAGE_URI,
  BASE_TOKEN_URI,
  DOCUMENTS,
  COLLECTION_METADATA,
  SECURITY_IDENTIFIERS,
  CURRENT_FUNDING_ROUND,
} from './scriptInputs/nftInputs';
import {
  ISSUER_MNEMONIC,
  ASSET_IDS_PATH,
  NFT_COLLECTION_ASSET_KEY,
} from './scriptInputs/common';
import { getSdkInstance } from './connect';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

const main = async () => {
  try {
    console.log('Starting create-nft-collection script...');
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: ISSUER_MNEMONIC }],
    });

    const sdk = await getSdkInstance();
    await sdk.setSigningManager(signingManager);

    // Get global metadata keys
    const globalKeyIds: Record<string, BigNumber> = {};
    if (
      INCLUDE_TOKEN_URI_AS_COLLECTION_KEY ||
      INCLUDE_IMAGE_URI_AS_COLLECTION_KEY ||
      BASE_IMAGE_URI ||
      BASE_TOKEN_URI
    ) {
      const globalMetadataKeys = await sdk.assets.getGlobalMetadataKeys();
      globalMetadataKeys.forEach(({ name, id }) => {
        globalKeyIds[name] = id;
      });
    }

    // Add global metadata keys to collection keys if required
    if (INCLUDE_TOKEN_URI_AS_COLLECTION_KEY) {
      COLLECTION_KEYS.push({
        id: globalKeyIds.tokenUri,
        type: MetadataType.Global,
      });
    }
    if (INCLUDE_IMAGE_URI_AS_COLLECTION_KEY) {
      COLLECTION_KEYS.push({
        id: globalKeyIds.imageUri,
        type: MetadataType.Global,
      });
    }

    // Create the NFT collection
    console.log(`\nCreating NFT Collection:`);
    const createNftTx = await sdk.assets.createNftCollection({
      collectionKeys: COLLECTION_KEYS,
      documents: DOCUMENTS,
      name: COLLECTION_NAME,
      nftType: NFT_TYPE,
      securityIdentifiers: SECURITY_IDENTIFIERS,
      ticker: TICKER,
    });

    // Subscribe to transaction status changes
    const unsubCreateNft = createNftTx.onStatusChange(handleTxStatusChange);

    // Execute the collection creation transaction
    const nftCollection = await createNftTx.run();
    const assetId = nftCollection.id;

    console.log(`\nCollection created with asset ID: ${assetId}`);

    // Save the assetId to the consolidated JSON file for use by subsequent scripts
    assetIds[NFT_COLLECTION_ASSET_KEY] = assetId;
    fs.writeFileSync(ASSET_IDS_PATH, JSON.stringify(assetIds, null, 2));

    // Unsubscribe from transaction status changes
    unsubCreateNft();

    // Prepare batch calls for additional actions
    const batchCalls: Array<
      | GenericPolymeshTransaction<MetadataEntry, MetadataEntry>
      | GenericPolymeshTransaction<Asset, Asset>
    > = [];

    // Modify NFT collection if CURRENT_FUNDING_ROUND is provided
    if (CURRENT_FUNDING_ROUND) {
      const modifyNftTx = await nftCollection.modify({
        fundingRound: CURRENT_FUNDING_ROUND,
      });
      batchCalls.push(modifyNftTx);
    }

    // Set the BASE_TOKEN_URI if provided
    if (BASE_TOKEN_URI) {
      const baseTokenUriMetadataEntry = await nftCollection.metadata.getOne({
        id: globalKeyIds.baseTokenUri,
        type: MetadataType.Global,
      });
      const setBaseTokenUriTx =
        await baseTokenUriMetadataEntry.set(BASE_TOKEN_URI);
      batchCalls.push(setBaseTokenUriTx);
    }

    // Set the BASE_IMAGE_URI if provided
    if (BASE_IMAGE_URI) {
      const baseImageUriMetadataEntry = await nftCollection.metadata.getOne({
        id: globalKeyIds.baseImageUri,
        type: MetadataType.Global,
      });
      const setBaseImageUriTx =
        await baseImageUriMetadataEntry.set(BASE_IMAGE_URI);
      batchCalls.push(setBaseImageUriTx);
    }

    // Create register metadata transactions and add to the batchCalls array
    const registerMetadataPromises = COLLECTION_METADATA.map(
      (metadataParams) => {
        return nftCollection.metadata.register(metadataParams);
      },
    );
    const registerMetadataTxs = await Promise.all(registerMetadataPromises);
    registerMetadataTxs.forEach((tx) => {
      batchCalls.push(tx);
    });

    // Execute batch calls for metadata and other actions
    if (batchCalls.length > 0) {
      const batchTransaction = await sdk.createTransactionBatch({
        transactions: batchCalls,
      });
      console.log(`\nAdding metadata to collection`);

      // Subscribe to transaction status changes
      const unsubAddMetadata =
        batchTransaction.onStatusChange(handleTxStatusChange);

      // Execute the batch transaction to add metadata
      await batchTransaction.run();

      // Unsubscribe from transaction status changes
      unsubAddMetadata();
    }

    console.log('Create-nft-collection script completed successfully.');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  Asset,
  AssetDocument,
  GenericPolymeshTransaction,
  MetadataEntry,
  RegisterMetadataParams,
  SecurityIdentifier,
} from '@polymeshassociation/polymesh-sdk/types';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import { ISSUER_MNEMONIC, NODE_URL } from './scriptInputs/common';

export const createAsset = async (assetConstants: {
  assetIdsPath: string;
  ticker: string | undefined;
  name: string;
  initialSupply: BigNumber;
  isDivisible: boolean;
  assetType: string;
  documents: AssetDocument[];
  metadata?: RegisterMetadataParams[];
  securityIdentifiers?: SecurityIdentifier[];
  fundingRound?: string;
  assetKey: string;
}) => {
  const {
    assetIdsPath,
    ticker,
    name,
    initialSupply,
    isDivisible,
    assetType,
    documents,
    metadata,
    securityIdentifiers,
    fundingRound,
    assetKey,
  } = assetConstants;

  try {
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: ISSUER_MNEMONIC }],
    });

    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl: NODE_URL,
      signingManager,
      polkadot: { noInitWarn: true },
    });

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name, '🎉');

    // Create the fungible asset
    console.log(`\nCreating Fungible Asset:`);

    const createAssetTx = await sdk.assets.createAsset({
      name,
      ticker,
      initialSupply,
      isDivisible,
      documents,
      securityIdentifiers,
      fundingRound,
      assetType,
    });

    // Subscribe to transaction status changes
    const unsubCreateAsset = createAssetTx.onStatusChange(handleTxStatusChange);

    // Execute the asset creation transaction
    const asset = await createAssetTx.run();
    const assetId = asset.id;
    console.log(`\nAsset created with asset ID: ${assetId}`);

    // Load previous asset IDs
    const assetIds = JSON.parse(fs.readFileSync(assetIdsPath, 'utf8'));

    // Save the assetId to the consolidated JSON file for use by subsequent scripts
    assetIds[assetKey] = assetId;
    fs.writeFileSync(assetIdsPath, JSON.stringify(assetIds, null, 2));

    // Unsubscribe from transaction status changes
    unsubCreateAsset();

    // Prepare batch calls for additional actions
    const batchCalls: Array<
      | GenericPolymeshTransaction<MetadataEntry, MetadataEntry>
      | GenericPolymeshTransaction<Asset, Asset>
    > = [];

    // Create register metadata transactions and add to the batchCalls array.
    if (metadata) {
      const registerMetadataPromises = metadata.map((metadataParams) => {
        return asset.metadata.register(metadataParams);
      });
      const registerMetadataTxs = await Promise.all(registerMetadataPromises);
      registerMetadataTxs.forEach((tx) => {
        batchCalls.push(tx);
      });
    }

    // Execute batch calls for metadata and other actions
    if (batchCalls.length) {
      const batchTransaction = await sdk.createTransactionBatch({
        transactions: batchCalls,
      });
      console.log(`\nAdding metadata to asset`);

      // Subscribe to transaction status changes
      const unsubAddMetadata =
        batchTransaction.onStatusChange(handleTxStatusChange);

      // Execute the batch transaction to add metadata
      await batchTransaction.run();

      // Unsubscribe from transaction status changes
      unsubAddMetadata();
    }

    // Disconnect from Polymesh
    console.log('\nDisconnecting');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default createAsset;

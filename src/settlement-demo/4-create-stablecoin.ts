import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  Asset,
  AssetDocument,
  GenericPolymeshTransaction,
  KnownAssetType,
  MetadataEntry,
  MetadataLockStatus,
  RegisterMetadataParams,
} from '@polymeshassociation/polymesh-sdk/types';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const nodeUrl = 'ws://localhost:9944/';

// Define asset input parameters
const ticker: string = 'DC-USD'; // Max 12 characters
const name: string = 'Demo USD Stablecoin';
const initialSupply: BigNumber = new BigNumber(100000000); // Initial supply of the asset
const isDivisible: boolean = true;
const assetType: KnownAssetType | string = KnownAssetType.StableCoin;

// Optionally attach external document references
const documents: AssetDocument[] = [
  {
    name: 'Whitepaper',
    uri: 'https://democorp.com/documents/whitepaper.pdf',
    type: 'Detailed information about the stablecoin, including its use case, technology, and legal framework.',
    contentHash: '0xabcdef00000000000000001234567891',
  },
  {
    name: 'Terms and Conditions',
    uri: 'https://democorp.com/documents/terms-and-conditions.pdf',
    type: 'The legal terms governing the stablecoin, outlining the rights and obligations of the holders.',
    contentHash: '0xabcdef00000000000000001234567892',
  },
  {
    name: "Issuer's Annual Report",
    uri: 'https://democorp.com/documents/annual-report-2023.pdf',
    type: "The latest annual report of DemoCorp, containing financial statements, business overview, and management's discussion and analysis.",
    contentHash: '0xabcdef00000000000000001234567893',
  },
  {
    name: 'Audit Report',
    uri: 'https://democorp.com/documents/audit-report.pdf',
    type: 'The latest audit report ensuring the stability and backing of the stablecoin.',
    contentHash: '0xabcdef00000000000000001234567894',
  },
  {
    name: 'Risk Factors',
    uri: 'https://democorp.com/documents/risk-factors.pdf',
    type: 'Document outlining the potential risks associated with the stablecoin, including market risks, operational risks, and legal risks.',
    contentHash: '0xabcdef00000000000000001234567895',
  },
  {
    name: 'Governance Framework',
    uri: 'https://democorp.com/documents/governance-framework.pdf',
    type: 'Detailed description of the governance structure for the stablecoin, including decision-making processes and roles of different stakeholders.',
    contentHash: '0xabcdef00000000000000001234567896',
  },
  {
    name: 'Compliance Report',
    uri: 'https://democorp.com/documents/compliance-report.pdf',
    type: 'Report detailing the compliance with relevant regulations, including MiCA.',
    contentHash: '0xabcdef00000000000000001234567897',
  },
];
// Optionally attach additional metadata
const metadata: RegisterMetadataParams[] | undefined = [
  {
    name: 'Description',
    specs: {
      description: 'Description of the asset',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    value: 'A stablecoin pegged to the US Dollar, issued by DemoCorp.',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
  {
    name: 'Issuer',
    specs: {
      description: 'Issuer of the stablecoin',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    value: 'DemoCorp',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
  {
    name: 'Website',
    specs: {
      description: 'Website of the issuer',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    value: 'https://democorp.com',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
];

const main = async () => {
  try {
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: MNEMONIC }],
    });

    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl,
      signingManager,
      polkadot: { noInitWarn: true },
    });

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name, '🎉');

    // Create the fungible asset
    console.log(`\nCreating Fungible Asset: ${ticker}`);
    const createAssetTx = await sdk.assets.createAsset({
      name,
      ticker,
      initialSupply,
      isDivisible,
      documents,
      assetType,
    });

    // Subscribe to transaction status changes
    const unsubCreateAsset = createAssetTx.onStatusChange(handleTxStatusChange);

    // Execute the asset creation transaction
    const asset = await createAssetTx.run();

    // Unsubscribe from transaction status changes
    unsubCreateAsset();

    // Prepare batch calls for additional actions
    const batchCalls: Array<
      | GenericPolymeshTransaction<MetadataEntry, MetadataEntry>
      | GenericPolymeshTransaction<Asset, Asset>
    > = [];

    // Create register metadata transactions and add to the batchCalls array.
    const registerMetadataPromises = metadata.map((metadataParams) => {
      return asset.metadata.register(metadataParams);
    });
    const registerMetadataTxs = await Promise.all(registerMetadataPromises);
    registerMetadataTxs.forEach((tx) => {
      batchCalls.push(tx);
    });

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
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

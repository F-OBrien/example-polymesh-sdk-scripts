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
  SecurityIdentifier,
  SecurityIdentifierType,
} from '@polymeshassociation/polymesh-sdk/types';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const nodeUrl = 'ws://localhost:9944/';

// Define asset input parameters
const ticker: string = 'DEMO-CORP'; // Max 12 characters
const name: string = 'DemoCorp Common Equity';
const initialSupply: BigNumber = new BigNumber(500000); // Initial supply of the asset
const isDivisible: boolean = false;
const assetType: KnownAssetType | string = KnownAssetType.EquityCommon;

// Optionally attach external document references
const documents: AssetDocument[] = [
  {
    name: 'Prospectus',
    uri: 'https://democorp.com/documents/prospectus.pdf',
    type: 'Detailed information about the equity offering, including financial projections, risk factors, and use of proceeds.',
    contentHash: '0xabcdef00000000000000001234567891',
  },
  {
    name: 'Terms and Conditions',
    uri: 'https://democorp.com/documents/terms-and-conditions.pdf',
    type: 'The legal terms governing the equity, outlining the rights and obligations of the shareholders.',
    contentHash: '0xabcdef00000000000000001234567892',
  },
  {
    name: "Issuer's Annual Report",
    uri: 'https://democorp.com/documents/annual-report-2023.pdf',
    type: "The latest annual report of DemoCorp, containing financial statements, business overview, and management's discussion and analysis.",
    contentHash: '0xabcdef00000000000000001234567893',
  },
  {
    name: 'Articles of Incorporation',
    uri: 'https://democorp.com/documents/articles-of-incorporation.pdf',
    type: 'The articles of incorporation of DemoCorp, outlining the establishment of the company and its governance structure.',
    contentHash: '0xabcdef00000000000000001234567894',
  },
  {
    name: 'Corporate Bylaws',
    uri: 'https://democorp.com/documents/corporate-bylaws.pdf',
    type: 'The bylaws of DemoCorp, detailing the internal rules governing the corporation.',
    contentHash: '0xabcdef00000000000000001234567895',
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
    value:
      'Common equity shares representing ownership in DemoCorp, with voting rights and potential for dividends.',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
  {
    name: 'Issuer',
    specs: {
      description: 'Issuer of the equity',
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

// Optionally specify security identifiers
const securityIdentifiers: SecurityIdentifier[] | undefined = [
  { type: SecurityIdentifierType.Cusip, value: '123456782' },
  { type: SecurityIdentifierType.Isin, value: 'US1234567899' },
];

// Optionally specify a current funding round
const fundingRound: string | undefined = 'Series A';

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
      securityIdentifiers,
      fundingRound,
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

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  Asset,
  AssetDocument,
  CollectionKeyInput,
  GenericPolymeshTransaction,
  KnownNftType,
  MetadataEntry,
  MetadataLockStatus,
  MetadataType,
  RegisterMetadataParams,
  SecurityIdentifier,
  SecurityIdentifierType,
  SetMetadataParams,
} from '@polymeshassociation/polymesh-sdk/types';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const nodeUrl = 'ws://localhost:9944/';

// Define NFT input parameters
const ticker: string = 'DC-NOTE-2024'; // Max 12 characters
const nftType: KnownNftType | BigNumber = KnownNftType.FixedIncome;
const collectionName: string | undefined =
  'DemoCorp Promissory Note NFT Collection';

// Define Collection keys (required properties for all NFTs in the collection)
const collectionKeys: CollectionKeyInput[] = [
  {
    name: 'Note ID',
    spec: {
      typeDef: 'Text - not SCALE encoded',
      description: 'A unique identifier for the promissory note',
    },
    type: MetadataType.Local,
  },
  {
    name: 'Name',
    spec: {
      typeDef: 'Text - not SCALE encoded',
      description: 'The name of the promissory note',
    },
    type: MetadataType.Local,
  },
  {
    name: 'Principal Amount',
    spec: {
      typeDef: 'Text - not SCALE encoded',
      description: 'The face value or principal amount of the promissory note',
    },
    type: MetadataType.Local,
  },
  {
    name: 'Interest Rate',
    spec: {
      typeDef: 'Text - not SCALE encoded',
      description:
        'The interest rate applicable to the promissory note, if any',
    },
    type: MetadataType.Local,
  },
  {
    name: 'Maturity Date',
    spec: {
      typeDef: 'Text - not SCALE encoded',
      description:
        'The date on which the promissory note matures and the principal is repaid',
    },
    type: MetadataType.Local,
  },
  {
    name: 'Issue Date',
    spec: {
      typeDef: 'Text - not SCALE encoded',
      description: 'The date on which the promissory note was issued',
    },
    type: MetadataType.Local,
  },
];

// Optionally define if global metadata keys `tokenUri` or `ImageUri` should be included in the collection keys
const includeTokenUriAsCollectionKey: boolean = false;
const includeImageUriAsCollectionKey: boolean = true;

// Optionally define base URIs
const baseImageUri: SetMetadataParams | undefined = undefined;
const baseTokenUri: SetMetadataParams | undefined = undefined;

// Optionally attach external document references
const documents: AssetDocument[] = [
  {
    name: 'Prospectus',
    uri: 'https://democorp.com/documents/prospectus.pdf',
    type: 'Detailed information about the note offering, including financial projections, risk factors, and use of proceeds.',
    contentHash: '0xabcdef00000000000000001234567891',
  },
  {
    name: 'Terms and Conditions',
    uri: 'https://democorp.com/documents/terms-and-conditions.pdf',
    type: 'The legal terms governing the notes, outlining the rights and obligations of the issuer and noteholders.',
    contentHash: '0xabcdef00000000000000001234567892',
  },
  {
    name: "Issuer's Annual Report",
    uri: 'https://democorp.com/documents/annual-report-2023.pdf',
    type: "The latest annual report of DemoCorp, containing financial statements, business overview, and management's discussion and analysis.",
    contentHash: '0xabcdef00000000000000001234567893',
  },
  {
    name: 'Rating Agency Report',
    uri: 'https://democorp.com/documents/rating-agency-report.pdf',
    type: 'A report from a reputable rating agency providing analysis and the credit rating of the notes.',
    contentHash: '0xabcdef00000000000000001234567894',
  },
];

// Optionally attach additional collection metadata
const collectionMetadata: RegisterMetadataParams[] | undefined = [
  {
    name: 'Description',
    specs: {
      description: 'Description of the NFT collection',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    value:
      "A collection of NFTs representing DemoCorp's corporate promissory notes, each with unique terms and conditions.",
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
  {
    name: 'Rating',
    specs: {
      description: 'Credit rating of the note collection',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    value: 'AA',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
  {
    name: 'Issuer',
    specs: {
      description: 'Issuer of the notes',
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
    value: 'https://democorp.com/notes',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
  {
    name: 'Image',
    specs: {
      description: 'URL to a representative image for the collection',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    value: 'https://democorp.com/images/note-collection.png',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
];

// Optionally specify security identifiers
const securityIdentifiers: SecurityIdentifier[] | undefined = [
  { type: SecurityIdentifierType.Cusip, value: '987654324' },
  { type: SecurityIdentifierType.Isin, value: 'US9876543219' },
];

// Optionally specify a current funding round
const currentFundingRound: string | undefined = 'Current Round';

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

    // Get global metadata keys
    const globalKeyIds: Record<string, BigNumber> = {};
    if (
      includeTokenUriAsCollectionKey ||
      includeImageUriAsCollectionKey ||
      baseImageUri ||
      baseTokenUri
    ) {
      const globalMetadataKeys = await sdk.assets.getGlobalMetadataKeys();
      globalMetadataKeys.forEach(({ name, id }) => {
        globalKeyIds[name] = id;
      });
    }

    // Add global metadata keys to collection keys if required
    if (includeTokenUriAsCollectionKey) {
      collectionKeys.push({
        id: globalKeyIds.tokenUri,
        type: MetadataType.Global,
      });
    }
    if (includeImageUriAsCollectionKey) {
      collectionKeys.push({
        id: globalKeyIds.imageUri,
        type: MetadataType.Global,
      });
    }

    // Create the NFT collection
    console.log(`\nCreating NFT Collection: ${ticker}`);
    const createNftTx = await sdk.assets.createNftCollection({
      collectionKeys,
      documents,
      name: collectionName,
      nftType,
      securityIdentifiers,
      ticker,
    });

    // Subscribe to transaction status changes
    const unsubCreateNft = createNftTx.onStatusChange(handleTxStatusChange);

    // Execute the collection creation transaction
    const nftCollection = await createNftTx.run();

    // Unsubscribe from transaction status changes
    unsubCreateNft();

    // Prepare batch calls for additional actions
    const batchCalls: Array<
      | GenericPolymeshTransaction<MetadataEntry, MetadataEntry>
      | GenericPolymeshTransaction<Asset, Asset>
    > = [];

    if (currentFundingRound) {
      const modifyNftTx = await nftCollection.modify({
        fundingRound: currentFundingRound,
      });
      batchCalls.push(modifyNftTx);
    }

    if (baseTokenUri) {
      const baseTokenUriMetadataEntry = await nftCollection.metadata.getOne({
        id: globalKeyIds.baseTokenUri,
        type: MetadataType.Global,
      });
      const setBaseTokenUriTx =
        await baseTokenUriMetadataEntry.set(baseTokenUri);
      batchCalls.push(setBaseTokenUriTx);
    }

    if (baseImageUri) {
      const baseImageUriMetadataEntry = await nftCollection.metadata.getOne({
        id: globalKeyIds.baseImageUri,
        type: MetadataType.Global,
      });
      const setBaseImageUriTx =
        await baseImageUriMetadataEntry.set(baseImageUri);
      batchCalls.push(setBaseImageUriTx);
    }

    // Create register metadata transactions and add to the batchCalls array.
    const registerMetadataPromises = collectionMetadata.map(
      (metadataParams) => {
        return nftCollection.metadata.register(metadataParams);
      },
    );
    const registerMetadataTxs = await Promise.all(registerMetadataPromises);
    registerMetadataTxs.forEach((tx) => {
      batchCalls.push(tx);
    });

    // Execute batch calls for metadata and other actions
    if (batchCalls.length) {
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

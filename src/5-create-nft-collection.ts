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
import { handleTxStatusChange } from './helpers';

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const nodeUrl = 'ws://localhost:9944/';

// Define NFT input parameters
const ticker: string = 'NFT0001'; // Max 12 characters
const nftType: KnownNftType | BigNumber = KnownNftType.Derivative; // new BigNumber(8); // KnownNftType.Derivative or Invoice or FixedIncome
const collectionName: string | undefined = 'Test NFT Collection'; // Optional

// Define Collection keys (required properties for all NFT's in the collection)
const collectionKeys: CollectionKeyInput[] = [
  {
    name: 'Background',
    spec: {
      description: 'Token Attribute',
      typeDef: 'Text - not SCALE encoded',
      url: undefined,
    },
    type: MetadataType.Local,
  },
  {
    name: 'Clothes',
    spec: { typeDef: 'Text - not SCALE encoded' },
    type: MetadataType.Local,
  },
  {
    name: 'Earring',
    spec: { typeDef: 'Text - not SCALE encoded' },
    type: MetadataType.Local,
  },
  {
    name: 'Eyes',
    spec: { typeDef: 'Text - not SCALE encoded' },
    type: MetadataType.Local,
  },
  {
    name: 'Fur',
    spec: { typeDef: 'Text - not SCALE encoded' },
    type: MetadataType.Local,
  },
  {
    name: 'Hat',
    spec: { typeDef: 'Text - not SCALE encoded' },
    type: MetadataType.Local,
  },
  {
    name: 'Mouth',
    spec: { typeDef: 'Text - not SCALE encoded' },
    type: MetadataType.Local,
  },
];

// Define if global metadata keys `tokenUri` or `ImageUri`
// should be included in the collection keys
const includeTokenUriAsCollectionKey: boolean = false; // true;
const includeImageUriAsCollectionKey: boolean = false; // true;

// Optionally define a base URIs. A base URI's should not be defined for the collection
// if the a corresponding collection key (`tokenUri` or `ImageUri`) is already included
const baseImageUri: SetMetadataParams | undefined = {
  value: 'ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/',
  details: { lockStatus: MetadataLockStatus.Unlocked, expiry: null },
};
const baseTokenUri: SetMetadataParams | undefined = {
  value: 'ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/',
  details: { lockStatus: MetadataLockStatus.Unlocked, expiry: null },
};

// Optionally attach external documents references
const documents: AssetDocument[] = [
  {
    name: 'test document',
    uri: 'https://example.com/',
    type: 'test document',
    contentHash: '0x12345678910',
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
    value: 'A NFT collection created for testing',
    details: { lockStatus: MetadataLockStatus.Locked, expiry: null },
  },
];

// Optionally specify security identifiers
const securityIdentifiers: SecurityIdentifier[] | undefined = [
  { type: SecurityIdentifierType.Cusip, value: '037833100' },
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

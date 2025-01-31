// Constants for the Polymesh NFT creation script

import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  AssetDocument,
  CollectionKeyInput,
  KnownNftType,
  MetadataLockStatus,
  MetadataType,
  RegisterMetadataParams,
  SecurityIdentifier,
  SecurityIdentifierType,
  SetMetadataParams,
} from '@polymeshassociation/polymesh-sdk/types';

// TICKER is an optional ticker symbol of the NFT collection
export const TICKER: string | undefined = undefined; // 'PROTO-NFTS-2';
export const NFT_TYPE: KnownNftType | string | BigNumber = 'NFT';
export const COLLECTION_NAME = 'DemoCorp Promissory Note NFT Collection';
// define the location to read the NFT metadata from
export const CSV_FILE_PATH = './src/settlement-demo/scriptInputs/nft_data.csv';
// Set the maximum number of NFT's to create in a single batch transaction
export const MAX_BATCH_SIZE = 100;

export const COLLECTION_KEYS: CollectionKeyInput[] = [
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

export const INCLUDE_TOKEN_URI_AS_COLLECTION_KEY = false;
export const INCLUDE_IMAGE_URI_AS_COLLECTION_KEY = true;

export const BASE_IMAGE_URI: SetMetadataParams | undefined = undefined;
export const BASE_TOKEN_URI: SetMetadataParams | undefined = undefined;

export const DOCUMENTS: AssetDocument[] = [
  {
    name: 'Prospectus',
    uri: 'https://democorp.com/documents/prospectus.pdf',
    type: 'Detailed information about the note offering, including financial projections, risk factors, and use of proceeds.',
    contentHash: '0xabcdef00000000000000001234567891',
    filedAt: new Date('2025-01-01'),
  },
  {
    name: 'Terms and Conditions',
    uri: 'https://democorp.com/documents/terms-and-conditions.pdf',
    type: 'The legal terms governing the notes, outlining the rights and obligations of the issuer and noteholders.',
    contentHash: '0xabcdef00000000000000001234567892',
    filedAt: new Date('2025-01-01'),
  },
  {
    name: "Issuer's Annual Report",
    uri: 'https://democorp.com/documents/annual-report-2023.pdf',
    type: "The latest annual report of DemoCorp, containing financial statements, business overview, and management's discussion and analysis.",
    contentHash: '0xabcdef00000000000000001234567893',
    filedAt: new Date('2025-01-01'),
  },
  {
    name: 'Rating Agency Report',
    uri: 'https://democorp.com/documents/rating-agency-report.pdf',
    type: 'A report from a reputable rating agency providing analysis and the credit rating of the notes.',
    contentHash: '0xabcdef00000000000000001234567894',
    filedAt: new Date('2025-01-01'),
  },
];

export const COLLECTION_METADATA: RegisterMetadataParams[] = [
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

export const SECURITY_IDENTIFIERS: SecurityIdentifier[] = [
  { type: SecurityIdentifierType.Cusip, value: '987654324' },
  { type: SecurityIdentifierType.Isin, value: 'US9876543219' },
];

export const CURRENT_FUNDING_ROUND: string | undefined = 'Current Round';

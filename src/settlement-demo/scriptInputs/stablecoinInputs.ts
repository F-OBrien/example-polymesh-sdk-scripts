import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  AssetDocument,
  MetadataLockStatus,
  RegisterMetadataParams,
  SecurityIdentifier,
} from '@polymeshassociation/polymesh-sdk/types';

// Define asset input parameters
export const TICKER: string | undefined = undefined; // 'DC-USD'; // Max 12 characters
export const NAME: string = 'Demo USD Stablecoin';
export const INITIAL_SUPPLY: BigNumber = new BigNumber(100000000); // Initial supply of the asset
export const IS_DIVISIBLE: boolean = true;
export const ASSET_TYPE: string = 'StableCoin';

// Optionally attach external document references
export const DOCUMENTS: AssetDocument[] = [
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
export const METADATA: RegisterMetadataParams[] | undefined = [
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

// Optionally specify security identifiers
export const SECURITY_IDENTIFIERS: SecurityIdentifier[] | undefined = undefined;

// Optionally specify a current funding round
export const FUNDING_ROUND: string | undefined = undefined;

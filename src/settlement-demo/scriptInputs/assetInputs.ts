// Import necessary types and classes from the Polymesh SDK
import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  AssetDocument,
  ConditionType,
  ConditionTarget,
  ClaimType,
  ScopeType,
  CountryCode,
  InputCondition,
  MetadataLockStatus,
  RegisterMetadataParams,
  SecurityIdentifier,
  SecurityIdentifierType,
  KnownAssetType,
} from '@polymeshassociation/polymesh-sdk/types';

// **Asset Input Parameters**
// These inputs are used across various scripts in the src/settlement-demo folder

export const TICKER: string | undefined = undefined; // Asset ticker symbol (max 12 characters)
// Example: 'DEMO-CORP'
export const NAME: string = 'DemoCorp Common Equity'; // Full name of the asset
export const INITIAL_SUPPLY: BigNumber = new BigNumber(500000); // Initial supply of the asset
export const IS_DIVISIBLE: boolean = false; // Indicates whether the asset is divisible
export const ASSET_TYPE: KnownAssetType | string = KnownAssetType.EquityCommon; // Type/category of the asset

// **External Document References**
// Optionally attach external documents related to the asset
export const DOCUMENTS: AssetDocument[] = [
  // List of asset documents such as prospectus, terms, reports, etc.
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

// **Additional Metadata**
// Optionally attach additional metadata to the asset
export const METADATA: RegisterMetadataParams[] | undefined = [
  // Metadata entries providing extra information about the asset
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

// **Security Identifiers**
// Optionally specify security identifiers like CUSIP, ISIN
export const SECURITY_IDENTIFIERS: SecurityIdentifier[] | undefined = [
  // List of security identifiers associated with the asset
  { type: SecurityIdentifierType.Cusip, value: '123456782' },
  { type: SecurityIdentifierType.Isin, value: 'US1234567899' },
];

// **Current Funding Round**
// Optionally specify the current funding round for the asset
export const FUNDING_ROUND: string | undefined = 'Series A'; // e.g., Seed, Series A, Series B

// **Compliance Rules Constructor**
// Constructs an array of compliance rules for asset transfers
export const constructComplianceRules = (
  signingIdentity: string,
  assetId: string,
): InputCondition[][] => {
  return [
    // Rule 1: Allow agents of the asset to send
    [
      {
        type: ConditionType.IsExternalAgent,
        target: ConditionTarget.Sender,
      },
    ],
    // Rule 2: Allow agents of the asset to receive
    [
      {
        type: ConditionType.IsExternalAgent,
        target: ConditionTarget.Receiver,
      },
    ],
    // Rule 3: Allow transfers between KYC'ed, non-US investors without sell/buy lockup claims
    [
      {
        type: ConditionType.IsPresent, // Both parties must have a KYC claim for the asset
        claim: {
          type: ClaimType.KnowYourCustomer,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Both,
      },
      {
        type: ConditionType.IsAbsent, // Both parties must not have a US jurisdiction claim
        claim: {
          type: ClaimType.Jurisdiction,
          code: CountryCode.Us,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Both,
      },
      {
        type: ConditionType.IsAbsent, // Sender must not have an active sell lockup claim
        claim: {
          type: ClaimType.SellLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Sender,
      },
      {
        type: ConditionType.IsAbsent, // Receiver must not have an active buy lockup claim
        claim: {
          type: ClaimType.BuyLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Receiver,
      },
    ],
    // Rule 4: Allow transfers between KYC'ed, accredited investors without sell/buy lockup claims
    [
      {
        type: ConditionType.IsPresent, // Both parties must have a KYC claim
        claim: {
          type: ClaimType.KnowYourCustomer,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Both,
      },
      {
        type: ConditionType.IsPresent, // Both parties must have an Accredited claim
        claim: {
          type: ClaimType.Accredited,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Both,
      },
      {
        type: ConditionType.IsAbsent, // Sender must not have an active sell lockup claim
        claim: {
          type: ClaimType.SellLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Sender,
      },
      {
        type: ConditionType.IsAbsent, // Receiver must not have an active buy lockup claim
        claim: {
          type: ClaimType.BuyLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Receiver,
      },
    ],
    // Rule 5: Allow from KYC'ed, accredited US investors to non-US KYC'ed investors without sell/buy lockup claims
    [
      {
        type: ConditionType.IsPresent, // Both parties must have a KYC claim
        claim: {
          type: ClaimType.KnowYourCustomer,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Both,
      },
      {
        type: ConditionType.IsPresent, // Sender must have an Accredited claim
        claim: {
          type: ClaimType.Accredited,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Sender,
      },
      {
        type: ConditionType.IsAbsent, // Receiver must not have a US jurisdiction claim
        claim: {
          type: ClaimType.Jurisdiction,
          code: CountryCode.Us,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Receiver,
      },
      {
        type: ConditionType.IsAbsent, // Sender must not have an active sell lockup claim
        claim: {
          type: ClaimType.SellLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Sender,
      },
      {
        type: ConditionType.IsAbsent, // Receiver must not have an active buy lockup claim
        claim: {
          type: ClaimType.BuyLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Receiver,
      },
    ],
    // Rule 6: Allow from KYC'ed non-US investors to KYC'ed accredited US investors without sell/buy lockup claims
    [
      {
        type: ConditionType.IsPresent, // Both parties must have a KYC claim
        claim: {
          type: ClaimType.KnowYourCustomer,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Both,
      },
      {
        type: ConditionType.IsPresent, // Receiver must have an Accredited claim
        claim: {
          type: ClaimType.Accredited,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Receiver,
      },
      {
        type: ConditionType.IsAbsent, // Sender must not have a US jurisdiction claim
        claim: {
          type: ClaimType.Jurisdiction,
          code: CountryCode.Us,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Sender,
      },
      {
        type: ConditionType.IsAbsent, // Sender must not have an active sell lockup claim
        claim: {
          type: ClaimType.SellLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Sender,
      },
      {
        type: ConditionType.IsAbsent, // Receiver must not have an active buy lockup claim
        claim: {
          type: ClaimType.BuyLockup,
          scope: {
            type: ScopeType.Asset,
            value: assetId,
          },
        },
        target: ConditionTarget.Receiver,
      },
    ],
  ];
};

// **Trusted Claim Issuers Constructor**
// Defines the trusted claim issuers for the asset
export const constructTrustedClaimIssuers = (signingIdentity: string) => {
  return [
    {
      identity: signingIdentity,
      // Trust this issuer for all claim types
      trustedFor: [
        ClaimType.KnowYourCustomer,
        ClaimType.Accredited,
        ClaimType.Affiliate,
        ClaimType.Blocked,
        ClaimType.BuyLockup,
        ClaimType.Custom,
        ClaimType.Exempted,
        ClaimType.Jurisdiction,
        ClaimType.SellLockup,
      ],
    },
  ];
};

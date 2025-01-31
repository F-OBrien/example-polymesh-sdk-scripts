import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import {
  CreateVenueParams,
  VenueType,
} from '@polymeshassociation/polymesh-sdk/types';

// Constants common to multiple scripts

// URL of the Polymesh node to connect to
export const NODE_URL = 'ws://localhost:9944'; // 'wss://rpc.polymesh.dev'; // 'wss://rpc.polymesh.live';

export const DEV_ACCOUNT_MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk';

export const ISSUER_MNEMONIC =
  'enough slot prevent enough cloth venue twin frost spatial acid pudding force//Issuer';
export const USER1_MNEMONIC =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//Investor1';
export const USER2_MNEMONIC =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//Investor2';

// Onboarding script constants
// Mnemonic for the CDD provider's account
export const CDD_PROVIDER_MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk//Eve';

// List of keys to onboard
export const KEYS_TO_ONBOARD: string[] = [];

// Amount of POLYX tokens to transfer during onboarding
export const POLYX_TOKENS_TO_TRANSFER = new BigNumber(10_000);

// Asset creation script constants
// Location of the file to save and load asset IDs
export const ASSET_IDS_PATH = 'src/settlement-demo/scriptInputs/assetIds.json';

// Asset keys used to access asset IDs from the JSON file
export const NFT_COLLECTION_ASSET_KEY = 'nftCollectionAssetId'; // Key for the NFT Collection asset ID
export const STABLE_COIN_ASSET_KEY = 'stableCoinAssetId'; // Key for the stable coin asset ID
export const FUNGIBLE_ASSET_KEY = 'fungibleAssetId'; // Key for the fungible asset ID

// Define portfolio input parameters
export const USER1_PORTFOLIO_NAME = 'Stablecoins';
export const USER2_PORTFOLIO_NAME = 'Notes';

// Venue input parameters
export const VENUE_DETAILS: CreateVenueParams = {
  description: 'DemoCorp Distributions',
  type: VenueType.Other,
  signers: [],
};

// Amounts for 7-fund-demo-identities.ts
// Amounts to fund demo identities with assets
export const AMOUNT_FUNGIBLE_ASSET = new BigNumber(25000); // Amount of fungible assets to transfer to User 1
export const AMOUNT_STABLECOIN_1 = new BigNumber(10500000); // Amount of stablecoins to transfer to User 1
export const AMOUNT_STABLECOIN_2 = new BigNumber(125000); // Amount of stablecoins to transfer to User 2
export const NFT_ID = new BigNumber(3); // ID of the NFT to transfer to User 2

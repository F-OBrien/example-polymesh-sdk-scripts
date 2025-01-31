import { createAsset } from './createAsset';
import {
  TICKER,
  NAME,
  INITIAL_SUPPLY,
  IS_DIVISIBLE,
  ASSET_TYPE,
  DOCUMENTS,
  METADATA,
  SECURITY_IDENTIFIERS,
  FUNDING_ROUND,
} from './scriptInputs/assetInputs';
import { ASSET_IDS_PATH, FUNGIBLE_ASSET_KEY } from './scriptInputs/common';

const main = async () => {
  console.log('Starting create-asset script...');
  await createAsset({
    assetIdsPath: ASSET_IDS_PATH,
    ticker: TICKER,
    name: NAME,
    initialSupply: INITIAL_SUPPLY,
    isDivisible: IS_DIVISIBLE,
    assetType: ASSET_TYPE,
    documents: DOCUMENTS,
    metadata: METADATA,
    securityIdentifiers: SECURITY_IDENTIFIERS,
    fundingRound: FUNDING_ROUND,
    assetKey: FUNGIBLE_ASSET_KEY,
  });
  console.log('Create-asset script completed successfully.');
};

main();

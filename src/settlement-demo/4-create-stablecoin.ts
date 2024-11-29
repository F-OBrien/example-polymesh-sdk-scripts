import { createAsset } from './createAsset';
import { ASSET_IDS_PATH, STABLE_COIN_ASSET_KEY } from './scriptInputs/common';
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
} from './scriptInputs/stablecoinInputs';

const main = async () => {
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
    assetKey: STABLE_COIN_ASSET_KEY,
  });
};

main();

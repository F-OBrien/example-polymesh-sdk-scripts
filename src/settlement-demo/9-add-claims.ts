import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { ClaimType, ScopeType } from '@polymeshassociation/polymesh-sdk/types';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import {
  ISSUER_MNEMONIC,
  USER1_MNEMONIC,
  USER2_MNEMONIC,
  ASSET_IDS_PATH,
  FUNGIBLE_ASSET_KEY,
} from './scriptInputs/common';
import { getSdkInstance } from './connect';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

const main = async () => {
  try {
    console.log('Starting add-claims script...');
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [
        { mnemonic: ISSUER_MNEMONIC },
        { mnemonic: USER1_MNEMONIC },
        { mnemonic: USER2_MNEMONIC },
      ],
    });

    const sdk = await getSdkInstance();
    await sdk.setSigningManager(signingManager);

    const keys = await sdk.accountManagement.getSigningAccounts();

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) throw new Error('No Signing Identity found');
    const identityUser1 = await keys[1].getIdentity();
    if (!identityUser1) throw new Error('Identity not found for user 1');
    const identityUser2 = await keys[2].getIdentity();
    if (!identityUser2) throw new Error('Identity not found for user 2');

    const addClaimsTx = await sdk.claims.addClaims({
      claims: [
        {
          claim: {
            type: ClaimType.KnowYourCustomer,
            scope: {
              type: ScopeType.Asset,
              value: assetIds[FUNGIBLE_ASSET_KEY],
            },
          },
          target: identityUser1,
        },
        {
          claim: {
            type: ClaimType.Accredited,
            scope: {
              type: ScopeType.Asset,
              value: assetIds[FUNGIBLE_ASSET_KEY],
            },
          },
          target: identityUser1,
        },
      ],
    });

    const unsubAddClaimsTx = addClaimsTx.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await addClaimsTx.run();

    // Unsubscribe from transaction status changes
    unsubAddClaimsTx();

    console.log('Add-claims script completed successfully.');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

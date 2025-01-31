import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import {
  ISSUER_MNEMONIC,
  ASSET_IDS_PATH,
  FUNGIBLE_ASSET_KEY,
} from './scriptInputs/common';
import {
  constructComplianceRules,
  constructTrustedClaimIssuers,
} from './scriptInputs/assetInputs';
import { getSdkInstance } from './connect';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

const main = async () => {
  try {
    console.log('Starting add-rules script...');
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: ISSUER_MNEMONIC }],
    });

    const sdk = await getSdkInstance();
    await sdk.setSigningManager(signingManager);

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) throw new Error('No Signing Identity found');

    const asset = await sdk.assets.getFungibleAsset({
      assetId: assetIds[FUNGIBLE_ASSET_KEY],
    });

    // Construct compliance rules using the helper function
    const rules = constructComplianceRules(signingIdentity.did, asset.id);

    // Construct trusted claim issuers using the helper function
    const trustedClaimIssuers = constructTrustedClaimIssuers(
      signingIdentity.did,
    );

    const addTrustedClaimIssuerTx =
      await asset.compliance.trustedClaimIssuers.add({
        claimIssuers: trustedClaimIssuers,
      });

    const addRuleTx = await asset.compliance.requirements.set({
      requirements: rules,
    });

    const txBatch = await sdk.createTransactionBatch({
      transactions: [addTrustedClaimIssuerTx, addRuleTx],
    });

    const unsubTxBatch = txBatch.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await txBatch.run();

    // Unsubscribe from transaction status changes
    unsubTxBatch();

    console.log('Add-rules script completed successfully.');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

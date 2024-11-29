import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import {
  ISSUER_MNEMONIC,
  NODE_URL,
  ASSET_IDS_PATH,
  FUNGIBLE_ASSET_KEY,
} from './scriptInputs/common';
import {
  constructComplianceRules,
  constructTrustedClaimIssuers,
} from './scriptInputs/assetInputs';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

const main = async () => {
  try {
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: ISSUER_MNEMONIC }],
    });

    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl: NODE_URL,
      signingManager,
      polkadot: { noInitWarn: true },
    });

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name, '🎉');

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

    // Disconnect from Polymesh
    console.log('\nDisconnecting');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import {
  NODE_URL,
  ISSUER_MNEMONIC,
  USER1_MNEMONIC,
  USER2_MNEMONIC,
  ASSET_IDS_PATH,
  FUNGIBLE_ASSET_KEY,
  STABLE_COIN_ASSET_KEY,
  NFT_COLLECTION_ASSET_KEY,
} from './scriptInputs/common';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

const main = async () => {
  try {
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [
        { mnemonic: ISSUER_MNEMONIC },
        { mnemonic: USER1_MNEMONIC },
        { mnemonic: USER2_MNEMONIC },
      ],
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
    const keys = await sdk.accountManagement.getSigningAccounts();

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) throw new Error('No Signing Identity found');
    const identityUser1 = await keys[1].getIdentity();
    if (!identityUser1) throw new Error('Identity not found for user 1');
    const identityUser2 = await keys[2].getIdentity();
    if (!identityUser2) throw new Error('Identity not found for user 2');

    const signerVenue = await signingIdentity.getVenues();
    if (!signerVenue[0])
      throw new Error('No settlement venue found please create one');

    const settlementInstructionTx = await signerVenue[0].addInstruction({
      legs: [
        {
          asset: assetIds[NFT_COLLECTION_ASSET_KEY],
          from: { identity: identityUser2, id: new BigNumber(1) },
          nfts: [new BigNumber(3)],
          to: { identity: identityUser1, id: new BigNumber(0) },
        },
        {
          amount: new BigNumber(5000),
          asset: assetIds[FUNGIBLE_ASSET_KEY],
          from: identityUser1,
          to: { identity: identityUser2, id: new BigNumber(0) },
        },
        {
          amount: new BigNumber(670000),
          asset: assetIds[STABLE_COIN_ASSET_KEY],
          from: { identity: identityUser1, id: new BigNumber(1) },
          to: { identity: identityUser2, id: new BigNumber(0) },
        },
      ],
      tradeDate: new Date(),
      memo: 'Demo DvP style transaction',
    });

    const unsubSettlementInstructionTx =
      settlementInstructionTx.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    const instruction = await settlementInstructionTx.run();
    console.log(
      `Settlement instruction ID ${instruction.id.toNumber()} created`,
    );

    // Unsubscribe from transaction status changes
    unsubSettlementInstructionTx();

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

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber } from '@polymeshassociation/polymesh-sdk';
import fs from 'fs';
import { handleTxStatusChange } from '../helpers';
import {
  AMOUNT_FUNGIBLE_ASSET,
  AMOUNT_STABLECOIN_1,
  AMOUNT_STABLECOIN_2,
  NFT_ID,
  ISSUER_MNEMONIC,
  USER1_MNEMONIC,
  USER2_MNEMONIC,
  ASSET_IDS_PATH,
  NFT_COLLECTION_ASSET_KEY,
  STABLE_COIN_ASSET_KEY,
  FUNGIBLE_ASSET_KEY,
} from './scriptInputs/common';
import { getSdkInstance } from './connect';

// Load the asset IDs dynamically
const assetIds = JSON.parse(fs.readFileSync(ASSET_IDS_PATH, 'utf8'));

// Define the mnemonic and node URL
const main = async () => {
  try {
    console.log('Starting fund-demo-identities script...');
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

    const settlementInstructionTx = await sdk.settlements.addInstruction({
      legs: [
        {
          amount: AMOUNT_FUNGIBLE_ASSET,
          asset: assetIds[FUNGIBLE_ASSET_KEY],
          from: signingIdentity,
          to: { identity: identityUser1, id: new BigNumber(0) },
        },
        {
          amount: AMOUNT_STABLECOIN_1,
          asset: assetIds[STABLE_COIN_ASSET_KEY],
          from: signingIdentity,
          to: { identity: identityUser1, id: new BigNumber(1) },
        },
        {
          amount: AMOUNT_STABLECOIN_2,
          asset: assetIds[STABLE_COIN_ASSET_KEY],
          from: signingIdentity,
          to: { identity: identityUser2, id: new BigNumber(0) },
        },
        {
          asset: assetIds[NFT_COLLECTION_ASSET_KEY],
          from: signingIdentity,
          nfts: [NFT_ID],
          to: { identity: identityUser2, id: new BigNumber(1) },
        },
      ],
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

    await sdk.setSigningAccount(keys[1]);

    // const user1Instructions = await identityUser1.getInstructions();
    const user1Instruction = await sdk.settlements.getInstruction({
      id: instruction.id,
    });
    // const affirmTx1 = await user1Instructions.pending[0].affirm();
    const affirmTx1 = await user1Instruction.affirm();

    const unsubAffirmTx1 = affirmTx1.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await affirmTx1.run();

    // Unsubscribe from transaction status changes
    unsubAffirmTx1();

    await sdk.setSigningAccount(keys[2]);

    const user2Instruction = await sdk.settlements.getInstruction({
      id: instruction.id,
    });
    const affirmTx2 = await user2Instruction.affirm();

    const unsubAffirmTx2 = affirmTx2.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await affirmTx2.run();

    unsubAffirmTx2();

    console.log('Fund-demo-identities script completed successfully.');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

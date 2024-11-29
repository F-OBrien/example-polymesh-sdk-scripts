import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { GenericPolymeshTransaction } from '@polymeshassociation/polymesh-sdk/types';
import { Identity } from '@polymeshassociation/polymesh-sdk/internal';
import { handleTxStatusChange } from '../helpers';
import {
  NODE_URL,
  CDD_PROVIDER_MNEMONIC,
  USER1_MNEMONIC,
  USER2_MNEMONIC,
  KEYS_TO_ONBOARD,
  POLYX_TOKENS_TO_TRANSFER,
  ISSUER_MNEMONIC,
} from './scriptInputs/common';

// Helper function to check if an identity exists for a given address
const doesIdentityExist = async (
  sdk: Polymesh,
  address: string,
): Promise<boolean> => {
  const account = await sdk.accountManagement.getAccount({ address });
  const identity = await account.getIdentity();
  return !!identity; // Returns true if identity exists
};

// Function to register identities for users without an identity
const registerIdentities = async (
  sdk: Polymesh,
  userPublicKeys: string[],
): Promise<GenericPolymeshTransaction<Identity, Identity>[]> => {
  const registrationPromises = userPublicKeys.map(async (publicKey) => {
    const identityExists = await doesIdentityExist(sdk, publicKey);

    if (!identityExists) {
      console.log(`Registering identity for ${publicKey}`);
      const registerIdentityTx = await sdk.identities.registerIdentity({
        createCdd: true,
        targetAccount: publicKey,
      });
      return registerIdentityTx;
    }
    return null;
  });

  const registrationTransactions = await Promise.all(registrationPromises);
  // Filter out null transactions
  const identityTransactions = registrationTransactions.filter(
    (value) => !!value,
  );
  return identityTransactions;
};

// Function to transfer POLYX to all users
const transferPolyxToUsers = async (
  sdk: Polymesh,
  userPublicKeys: string[],
): Promise<GenericPolymeshTransaction<void, void>[]> => {
  const transferPromises = userPublicKeys.map(async (publicKey) => {
    const transferTx = await sdk.network.transferPolyx({
      amount: POLYX_TOKENS_TO_TRANSFER,
      to: publicKey,
      memo: undefined,
    });
    return transferTx;
  });

  const transferTransactions = await Promise.all(transferPromises);
  return transferTransactions;
};

// Main function to onboard users and transfer POLYX
const main = async () => {
  try {
    // Create local signing manager
    const signingManager = await LocalSigningManager.create({
      accounts: [
        { mnemonic: CDD_PROVIDER_MNEMONIC || '//Alice' },
        { mnemonic: ISSUER_MNEMONIC },
        { mnemonic: USER1_MNEMONIC },
        { mnemonic: USER2_MNEMONIC },
        {
          mnemonic:
            'acquire island march famous glad zebra wasp cattle injury drill prefer deer//3',
        },
      ],
    });

    console.log('Connecting to Polymesh...');
    const sdk = await Polymesh.connect({
      nodeUrl: NODE_URL,
      signingManager,
      polkadot: { noInitWarn: true },
    });
    console.log('Connected to Polymesh 🎉');
    const signingAccountKeys = await signingManager.getAccounts();

    const userPublicKeys = signingAccountKeys.concat(KEYS_TO_ONBOARD);

    // Stage 1: Register identities for users without an identity
    const identityTransactions = await registerIdentities(sdk, userPublicKeys);

    // Execute identity registration transactions (if any)
    if (identityTransactions.length > 0) {
      console.log('Registering identities...');
      const batch = await sdk.createTransactionBatch({
        transactions: identityTransactions,
      });
      const unsubBatch = batch.onStatusChange(handleTxStatusChange);
      await batch.run();
      unsubBatch();
    } else {
      console.log('All users already have an identity.');
    }

    // Stage 2: Transfer POLYX to all users
    const transferTransactions = await transferPolyxToUsers(
      sdk,
      userPublicKeys,
    );

    // Execute POLYX transfer transactions
    if (transferTransactions.length > 0) {
      console.log('Transferring POLYX...');
      const batch = await sdk.createTransactionBatch({
        transactions: transferTransactions,
      });
      const unsubBatch = batch.onStatusChange(handleTxStatusChange);
      await batch.run();
      unsubBatch();
    }

    console.log('All transactions completed successfully!');
    await sdk.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

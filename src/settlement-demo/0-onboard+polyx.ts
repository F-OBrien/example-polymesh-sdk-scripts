import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { GenericPolymeshTransaction } from '@polymeshassociation/polymesh-sdk/types';
import { Identity } from '@polymeshassociation/polymesh-sdk/internal';
import { handleTxStatusChange } from '../helpers';

const MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk';
const nodeUrl = 'ws://localhost:9944/';
const derivationPath = '//Alice'; // Use your key's derivation path
const USER1 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//1';
const USER2 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//2';
const polyxAmount = new BigNumber(10); // Amount of POLYX to transfer

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
      amount: polyxAmount,
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
        { mnemonic: MNEMONIC, derivationPath },
        { mnemonic: USER1 },
        { mnemonic: USER2 },
      ],
    });

    console.log('Connecting to Polymesh...');
    const sdk = await Polymesh.connect({
      nodeUrl,
      signingManager,
      polkadot: { noInitWarn: true },
    });
    console.log('Connected to Polymesh 🎉');
    const accs = await signingManager.getAccounts();
    console.log(accs);

    const userPublicKeys = [
      '5DnUDDX2BMdkoNRpkK9PeTuv9AnyqFukoao2pHYSdSEN2SYL',
      '5FpeacP7GzPEohfndrg1RbbNoU6c5wd8W8oKVqw5NAVNX6tE',
      '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      '5CM75XcPiYtq53G3hqx2JB2A3CVUjwsaYJctHGb6anAqrL9r',
      '5CPJ1rPmNAzycr99W8MEhLB3oJUcuFZFz6jccJu24ZqnETf5',
      '5CS6CKKNPDvrRFtGLTo94hjZ1NuzgW8njxgkXrSrwspLz4mH',
    ]; // Replace with actual public keys

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
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const MNEMONIC = '//Alice';
const USER1 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//1';
const portfolio1Name = 'Stablecoins';
const USER2 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//2';
const portfolio2Name = 'Notes';
const nodeUrl = 'ws://localhost:9944/';

const main = async () => {
  try {
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: USER1 }, { mnemonic: USER2 }],
    });

    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl,
      signingManager,
      polkadot: { noInitWarn: true },
    });

    // Retrieve network properties
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name, '🎉');
    const keys = await sdk.accountManagement.getSigningAccounts();

    console.log(
      `\nCreating "${portfolio1Name}" portfolio for: ${keys[0].address}`,
    );

    const createPortfolioTx1 = await sdk.identities.createPortfolio({
      name: portfolio1Name,
    });

    const unsubPortfolio1 =
      createPortfolioTx1.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await createPortfolioTx1.run();

    // Unsubscribe from transaction status changes
    unsubPortfolio1();

    console.log(
      `\nCreating "${portfolio2Name}" portfolio for: ${keys[1].address}`,
    );

    sdk.setSigningAccount(keys[1]);
    const createPortfolioTx2 = await sdk.identities.createPortfolio({
      name: portfolio2Name,
    });

    const unsubPortfolio2 =
      createPortfolioTx2.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await createPortfolioTx2.run();

    // Unsubscribe from transaction status changes
    unsubPortfolio2();

    // Disconnect from Polymesh
    console.log('\nDisconnecting');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { handleTxStatusChange } from '../helpers';
import {
  NODE_URL,
  USER1_MNEMONIC,
  USER2_MNEMONIC,
  USER1_PORTFOLIO_NAME,
  USER2_PORTFOLIO_NAME,
} from './scriptInputs/common';

const main = async () => {
  try {
    // Create a local signing manager with two accounts
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: USER1_MNEMONIC }, { mnemonic: USER2_MNEMONIC }],
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

    console.log(
      `\nCreating "${USER1_PORTFOLIO_NAME}" portfolio for: ${keys[0].address}`,
    );

    const createPortfolioTx1 = await sdk.identities.createPortfolio({
      name: USER1_PORTFOLIO_NAME,
    });

    const unsubPortfolio1 =
      createPortfolioTx1.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await createPortfolioTx1.run();

    // Unsubscribe from transaction status changes
    unsubPortfolio1();

    console.log(
      `\nCreating "${USER2_PORTFOLIO_NAME}" portfolio for: ${keys[1].address}`,
    );

    sdk.setSigningAccount(keys[1]);
    const createPortfolioTx2 = await sdk.identities.createPortfolio({
      name: USER2_PORTFOLIO_NAME,
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
    console.error(error);
    process.exit(1);
  }
};

main();

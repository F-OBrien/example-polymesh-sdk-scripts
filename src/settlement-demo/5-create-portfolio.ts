import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { handleTxStatusChange } from '../helpers';
import {
  USER1_MNEMONIC,
  USER2_MNEMONIC,
  USER1_PORTFOLIO_NAME,
  USER2_PORTFOLIO_NAME,
} from './scriptInputs/common';
import { getSdkInstance } from './connect';

const main = async () => {
  try {
    console.log('Starting create-portfolio script...');
    // Create a local signing manager with two accounts
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: USER1_MNEMONIC }, { mnemonic: USER2_MNEMONIC }],
    });

    const sdk = await getSdkInstance();
    await sdk.setSigningManager(signingManager);

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

    console.log('Create-portfolio script completed successfully.');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

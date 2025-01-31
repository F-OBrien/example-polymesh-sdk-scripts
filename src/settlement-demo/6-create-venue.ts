import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { handleTxStatusChange } from '../helpers';
import { ISSUER_MNEMONIC, VENUE_DETAILS } from './scriptInputs/common';
import { getSdkInstance } from './connect';

const main = async () => {
  try {
    console.log('Starting create-venue script...');
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: ISSUER_MNEMONIC }],
    });

    const sdk = await getSdkInstance();
    await sdk.setSigningManager(signingManager);

    // Create the venue
    console.log(`\nCreating Venue:`);
    const createVenueTx = await sdk.settlements.createVenue(VENUE_DETAILS);

    // Subscribe to transaction status changes
    const unsubCreateVenue = createVenueTx.onStatusChange(handleTxStatusChange);

    // Execute the venue creation transaction
    const venue = await createVenueTx.run();
    console.log(`\nVenue created with ID: ${venue.id}`);

    // Unsubscribe from transaction status changes
    unsubCreateVenue();

    console.log('Create-venue script completed successfully.');
    await sdk.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { handleTxStatusChange } from '../helpers';
import {
  NODE_URL,
  ISSUER_MNEMONIC,
  VENUE_DETAILS,
} from './scriptInputs/common';

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

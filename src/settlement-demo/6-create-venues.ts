import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { VenueType } from '@polymeshassociation/polymesh-sdk/types';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const ALICE = '//Alice//stash';
const venueNameAlice1 = 'DemoCorp Distributions';
const venueNameAlice2 = 'DemoCorp Exchange';
const USER1 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//1';
const venueNameUser1 = "Alice's Venue";
const USER2 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//2';
const venueNameUser2 = "Bob's Venue";
const nodeUrl = 'ws://localhost:9944/';

const main = async () => {
  try {
    // Create a local signing manager with one account
    const signingManager = await LocalSigningManager.create({
      accounts: [{ mnemonic: ALICE }, { mnemonic: USER1 }, { mnemonic: USER2 }],
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
      `\nCreating venue "${venueNameAlice1}" portfolio for: ${keys[0].address}`,
    );

    const createVenueDistribution = await sdk.settlements.createVenue({
      description: venueNameAlice1,
      type: VenueType.Distribution,
    });
    const createVenueExchange = await sdk.settlements.createVenue({
      description: venueNameAlice2,
      type: VenueType.Exchange,
    });

    const batchTx = await sdk.createTransactionBatch({
      transactions: [createVenueDistribution, createVenueExchange],
    });
    const unsubCreateVenueTx1 = batchTx.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await batchTx.run();

    // Unsubscribe from transaction status changes
    unsubCreateVenueTx1();

    console.log(
      `\nCreating venue "${venueNameUser1}" portfolio for: ${keys[1].address}`,
    );

    await sdk.setSigningAccount(keys[1]);

    const createVenueTx2 = await sdk.settlements.createVenue({
      description: venueNameUser1,
      type: VenueType.Other,
    });

    const unsubCreateVenueTx2 =
      createVenueTx2.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await createVenueTx2.run();

    // Unsubscribe from transaction status changes
    unsubCreateVenueTx2();

    console.log(
      `\nCreating venue "${venueNameUser2}" portfolio for: ${keys[2].address}`,
    );

    await sdk.setSigningAccount(keys[2]);

    const createVenueTx3 = await sdk.settlements.createVenue({
      description: venueNameUser1,
      type: VenueType.Other,
    });

    const unsubCreateVenueTx3 =
      createVenueTx3.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await createVenueTx3.run();

    // Unsubscribe from transaction status changes
    unsubCreateVenueTx3();

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

import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { ClaimType, ScopeType } from '@polymeshassociation/polymesh-sdk/types';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const ALICE = '//Alice//stash';
const USER1 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//1';
const USER2 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//2';
const nodeUrl = 'ws://localhost:9944/';

const ASSET = 'DEMO-CORP';
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

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) throw new Error('No Signing Identity found');
    const identityUser1 = await keys[1].getIdentity();
    if (!identityUser1) throw new Error('Identity not found for user 1');
    const identityUser2 = await keys[2].getIdentity();
    if (!identityUser2) throw new Error('Identity not found for user 2');

    const addClaimsTx = await sdk.claims.addClaims({
      claims: [
        {
          claim: {
            type: ClaimType.KnowYourCustomer,
            scope: { type: ScopeType.Ticker, value: ASSET },
          },
          target: identityUser1,
        },
        {
          claim: {
            type: ClaimType.Accredited,
            scope: { type: ScopeType.Ticker, value: ASSET },
          },
          target: identityUser1,
        },
      ],
    });

    const unsubAddClaimsTx = addClaimsTx.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await addClaimsTx.run();

    // Unsubscribe from transaction status changes
    unsubAddClaimsTx();

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

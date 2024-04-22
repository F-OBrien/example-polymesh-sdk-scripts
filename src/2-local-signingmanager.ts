import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';

const nodeUrl = 'wss://testnet-rpc.polymesh.live';

const main = async () => {
  try {
    // Set up the local signing manager with accounts
    const signingManager = await LocalSigningManager.create({
      accounts: [
        {
          // `mnemonic` accepts a BIP39 compatible mnemonic string.
          mnemonic:
            'crash pause between write pride deliver moon mountain chief grocery steak draw',
        },
        {
          // `seed` accepts a 32byte hex string.
          // This seed is the same private key derived from the above mnemonic.
          // Keys can only be added once to the signing manager so this seed is ignored.
          seed: '0xb8784bc70719db0a9c240587688698e656b2f6c9b28e48e7185178ad6cbf524b',
        },
        {
          // Omitting a mnemonic or uri defaults to the well known mnemonic
          // "bottom drive obey lake curtain smoke basket hold race lonely fit walk" which
          // dev accounts are derived from. e.g. Alice, Bob, Charlie etc.
          uri: '',
          // All private key types accept an optional `derivationPath`.
          // hard-derivation path is always prefixed by // to indicate the type.
          // soft-derivation path is always prefixed by / to indicate the type.
          // Dev accounts use a well known mnemonic and can be derived with just a derivation path.
          // e.g. '//Alice' '//Alice//stash', '//Bob'
          derivationPath: '//Alice',
        },
        // Add more accounts if needed.
      ],
    });

    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl,
      signingManager,
      polkadot: { noInitWarn: true },
    });

    // Retrieve network properties to confirm a successful connection
    const networkProps = await sdk.network.getNetworkProperties();
    console.log(
      'Successfully connected to',
      networkProps.name,
      'Spec version:',
      networkProps.version.toString(),
    );

    // Get the list of signing keys from the signing manager
    const signingKeys = await signingManager.getAccounts();
    console.log('Signing keys:', signingKeys);

    // Log the address of the default signing key
    console.log(
      'Default signing key:',
      sdk.accountManagement.getSigningAccount()?.address,
    );

    // Change the default signer to the second signing key (//Alice)
    console.log('Changing default signer to', signingKeys[1]);
    await sdk.setSigningAccount(signingKeys[1]);

    // Log the address of the updated default signing key
    console.log(
      'Default signing key:',
      sdk.accountManagement.getSigningAccount()?.address,
    );

    console.log('Disconnecting');
    await sdk.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

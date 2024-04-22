import { HashicorpVaultSigningManager } from '@polymeshassociation/hashicorp-vault-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';

const nodeUrl = 'wss://testnet-rpc.polymesh.live';
const main = async () => {
  try {
    // Set up the local signing manager with accounts
    const signingManager = new HashicorpVaultSigningManager({
      // URL of the Vault's transit engine
      url: 'http://localhost:8200/v1/transit',
      // authentication token
      token: 'YOUR TOKEN HERE',
    });
    console.log('123');

    signingManager.setSs58Format(42);
    console.log(await signingManager.getAccounts());
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
    console.log('Vault keys', await signingManager.getVaultKeys());

    // Log the address of the default signing key
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

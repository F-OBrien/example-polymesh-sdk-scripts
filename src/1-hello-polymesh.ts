import { Polymesh } from '@polymeshassociation/polymesh-sdk';

const nodeUrl = 'wss://testnet-rpc.polymesh.live';

const main = async () => {
  try {
    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl,
      // polkadot: { noInitWarn: true },
    });

    // Retrieve network properties to confirm a successful connection
    const networkProps = await sdk.network.getNetworkProperties();
    console.log(
      'Successfully connected to',
      networkProps.name,
      'Spec version:',
      networkProps.version.toString(),
    );

    // Disconnect
    console.log('Disconnecting');
    await sdk.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

main();

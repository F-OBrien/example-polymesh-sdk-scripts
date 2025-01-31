import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { NODE_URL } from './scriptInputs/common';

let sdk: Polymesh | null = null;

export async function getSdkInstance() {
  if (!sdk) {
    console.log('Connecting to Polymesh');

    sdk = await Polymesh.connect({
      nodeUrl: NODE_URL,
      polkadot: { noInitWarn: true },
    });
    const networkProps = await sdk.network.getNetworkProperties();
    console.log('Successfully connected to', networkProps.name, '🎉');
  }
  return sdk;
}

export async function disconnectSdk() {
  if (sdk) {
    await sdk.disconnect();
    sdk = null;
  }
}

/**
 * Transaction Preparation and Offline Signing Demo
 *
 * This script demonstrates the complete lifecycle of a Polymesh transaction:
 * 1. Transaction preparation using the Polymesh SDK
 * 2. Payload generation for offline signing
 * 3. Transaction signing
 * 4. Transaction submission
 */

/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
import { Polymesh, BigNumber } from '@polymeshassociation/polymesh-sdk';
import { Keyring } from '@polkadot/keyring';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

// Constants for network configuration
const NODE_WS_URL = 'wss://testnet-rpc.polymesh.live';
const NODE_HTTP_URL = 'https://testnet-rpc.polymesh.live/http';

// Constants for test account configuration
const MNEMONIC =
  'draw squirrel stereo correct harsh gauge attend master outside pistol unique poem'; // address: 5DDQLWxqkBNtKgTsFXFW4owZrfU5j1iaRFtFH9FSjHZD6ie7
const DERIVATION_PATH1 = '//key1'; // address: 5HU2LPoN46GxMScc4tUyZxvVFeW3T8SWdkPBqtojKn7NXSE2

/**
 * Fetches the current chain metadata from the node.
 * @returns Chain metadata as a hex string
 * @throws Error if the request fails or returns an invalid response
 */
async function fetchChainMetadata(): Promise<`0x${string}`> {
  try {
    const response = await fetch(NODE_HTTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'state_getMetadata',
        params: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { error, result } = await response.json();
    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }

    return result.startsWith('0x') ? result : `0x${result}`;
  } catch (error) {
    throw new Error(
      `Metadata fetch failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Submits a signed transaction to the Polymesh network.
 * @param extrinsicHex - SCALE-encoded signed extrinsic in hex format
 * @returns Transaction hash
 * @throws Error if submission fails
 */
async function submitTransaction(extrinsicHex: string): Promise<`0x${string}`> {
  const response = await fetch(NODE_HTTP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'author_submitExtrinsic',
      params: [extrinsicHex],
    }),
  });

  const { error, result } = await response.json();
  if (error || !result) {
    throw new Error(
      `Transaction submission failed: ${
        error?.message || 'No result returned'
      }`,
    );
  }

  return result;
}

const main = async () => {
  try {
    await cryptoWaitReady();

    // ********************************************************************************************************************
    // STEP 1: Initialize the keyring and add accounts. Public keys are required for preparing the transaction and the keyring
    // will later be used for signing the transaction. This step can be offline and be replaced with any key management solution.
    // ********************************************************************************************************************

    const keyring = new Keyring({ type: 'sr25519' }); // Polymesh supports signing with SR25519, ED25519 and  ECDSA keys.
    const account1 = keyring.addFromUri(MNEMONIC);
    const account2 = keyring.addFromUri(`${MNEMONIC}${DERIVATION_PATH1}`);

    console.log('Available accounts:', [account1.address, account2.address]);

    // ********************************************************************************************************************
    // STEP 2: Connect to the Polymesh blockchain prepare a transaction with the Polymesh SDK. This step requires access
    // to the chain as the SDK uses the chain to validate the transaction inputs when preparing the transaction.
    // ********************************************************************************************************************

    console.log('\nConnecting to Polymesh...');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl: NODE_WS_URL,
      polkadot: { noInitWarn: true },
    });

    const networkProps = await sdk.network.getNetworkProperties();
    console.log(
      `\nSuccessfully connected to ${
        networkProps.name
      }, Spec version: ${networkProps.version.toString()}`,
    );

    // Prepare a POLYX transfer transaction
    const amount = new BigNumber(1);
    console.log(
      `\nSending ${amount.toString()} POLYX from ${account1.address} to ${
        account2.address
      }`,
    );

    const transferTx = await sdk.network.transferPolyx(
      {
        amount,
        to: account2.address,
        memo: 'Test memo',
      },
      {
        // A signing account must explicitly be provided when not attaching a signing manager too the SDK instance.
        signingAccount: account1.address,
        // nonce can optionally be provided for transaction ordering.
        nonce: undefined,
        // mortality can optionally be provided for transaction expiry. If not provided the transaction will be valid for 250 blocks.
        mortality: {
          // Set immortal to true for an immortal transaction.
          // This may be necessary if there is a delay between signing and submitting the transaction.
          immortal: true,
        },
      },
    );

    // Generate a signable payload for offline signing
    const signablePayload = await transferTx.toSignablePayload();
    console.log(
      '\nJSON payload:',
      JSON.stringify(signablePayload.payload, null, 2),
    );

    // ********************************************************************************************************************
    // STEP 3: The transaction payload is transferred to the signer for signing. This step can be offline and be replaced
    // with any key management solution.
    // ********************************************************************************************************************

    // Fetch chain metadata for encoding and decoding transactions. While this can be stored off chain. Note: Metadata will
    // change on chain upgrades and needs to match the current chain version or the transaction will fail.
    const metadataOriginal = await fetchChainMetadata();

    // Create a new type registry and set the metadata
    const registry = new TypeRegistry();
    const metadata = new Metadata(registry, metadataOriginal);
    registry.setMetadata(metadata, undefined, undefined, true);

    const {
      payload: { address, version },
      payload,
    } = signablePayload;

    const signingPair = keyring.getPair(address);

    // Create an extrinsic payload for signing
    const extrinsicPayload = registry.createType('ExtrinsicPayload', payload, {
      version,
    });

    // Create an unsigned extrinsic from the payload
    const extrinsic = registry.createType('Extrinsic', payload);
    // The type registry can also be used to decode the transaction for clear signing
    console.log(
      '\nUnsigned Extrinsic:',
      JSON.stringify(extrinsic.toHuman(true), null, 2),
    );

    // Sign the payload using the keyring, This should be replaced with the appropriate signer.
    // NOTE: Extrinsic data over 256 bytes must be hashed before signing. If not handled by the signer
    // data must be hashed before sending for signing.
    // e.g. const fixedData = data.length > 256 ? blake2AsU8a(data) : data;
    // const hashedExtrinsic = Buffer.from(fixedData).toString('hex');

    const rawSig = signingPair.sign(extrinsicPayload.toU8a(true));
    // Sign raw bytes and add appropriate key type prefix
    // Prefix values:
    // 0x00 = ED25519
    // 0x01 = SR25519
    // 0x02 = ECDSA
    let prefix: Uint8Array = new Uint8Array();
    if (signingPair.type === 'ed25519') {
      prefix = new Uint8Array([0x00]);
    } else if (signingPair.type === 'sr25519') {
      prefix = new Uint8Array([0x01]);
    } else if (signingPair.type === 'ecdsa') {
      prefix = new Uint8Array([0x02]);
    }

    const signature = u8aToHex(Uint8Array.of(...prefix, ...rawSig));

    console.log('\nSignature:', signature);

    // ********************************************************************************************************************
    // STEP 4: The signed transaction is submitted to the network. The transaction will be validated by the network and if valid, will be included in a block.
    // ********************************************************************************************************************

    // Submit the signed transaction to the network. In this can be done with the SDK as per below.
    // const details = await sdk.network.submitTransaction(
    //   signablePayload,
    //   signature,
    // );

    // ********************************************************************************************************************
    // OR using the polkadot API.

    // Add the signature using the extrinsic
    // extrinsic.addSignature(payload.address, signature, payload);

    // Create a submittable extrinsic
    // const transaction = sdk._polkadotApi.tx(extrinsic);
    // console.log(
    //   '\nSigned Extrinsic',
    //   JSON.stringify(transaction.toHuman(true), null, 2),
    // );

    // Send the signed transaction
    // await transaction.send((result) => {
    //   console.log('status', result.status.toHuman());
    // });

    // ********************************************************************************************************************
    // OR using a direct RPC submission

    // Add the signature using the extrinsic
    extrinsic.addSignature(payload.address, signature, payload);

    const extrinsicHex = extrinsic.toHex();

    const txHash = await submitTransaction(extrinsicHex);
    console.log('\nTransaction hash:', txHash);

    // ********************************************************************************************************************

    // Disconnect from the SDK
    console.log('\nDisconnecting from Polymesh...');
    await sdk.disconnect();

    process.exit(0);
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

main();

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
import { compactToU8a, hexToU8a, u8aConcat, u8aToHex } from '@polkadot/util';

// Network configuration
const NODE_WS_URL = 'wss://testnet-rpc.polymesh.live';
const NODE_HTTP_URL = 'https://testnet-rpc.polymesh.live/http';

// Test account configuration
const MNEMONIC =
  'draw squirrel stereo correct harsh gauge attend master outside pistol unique poem'; // address: 5DDQLWxqkBNtKgTsFXFW4owZrfU5j1iaRFtFH9FSjHZD6ie7
const derivationPath1 = '//key1'; // address: 5HU2LPoN46GxMScc4tUyZxvVFeW3T8SWdkPBqtojKn7NXSE2

/**
 * Fetches the current chain metadata from the node using JSON-RPC.
 *
 * Chain metadata is crucial for:
 * - Encoding/decoding transactions
 * - Understanding available chain calls and their parameters
 * - Properly formatting transaction data
 *
 * Note: Metadata changes with chain upgrades, so it must match the current chain version.
 * In production, you might want to cache this data and update it on chain upgrades.
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

const main = async () => {
  try {
    await cryptoWaitReady();

    // ********************************************************************************************************************
    // STEP 1: Initialize the keyring and add accounts.
    // The keyring is used both for getting public keys during transaction preparation
    // and for signing transactions. In a production environment, this could be replaced
    // with any key management solution.
    // ********************************************************************************************************************

    // Initialize keyring with SR25519 - the recommended key type for Polymesh
    // Other supported types: ED25519 and ECDSA
    const keyring = new Keyring({ type: 'sr25519' });
    const account1 = keyring.addFromUri(MNEMONIC);
    const account2 = keyring.addFromUri(`${MNEMONIC}${derivationPath1}`);

    console.log('Available addresses:', [account1.address, account2.address]);

    // ********************************************************************************************************************
    // STEP 2: Connect to Polymesh and prepare the transaction
    // This step requires chain access to validate transaction inputs and retrieve
    // current chain state (e.g., nonce, metadata)
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

    // Create transaction using the SDK
    const transferTx = await sdk.network.transferPolyx(
      {
        amount,
        to: account2.address,
        memo: 'Test memo', // Optional memo field for transaction reference
      },
      {
        // A signing account must explicitly be provided when not attaching a signing manager too the SDK instance.
        signingAccount: account1.address,
        // nonce can optionally be provided for transaction ordering.
        // Nonce: Optional, auto-calculated if undefined
        // Important for transaction ordering
        nonce: undefined,
        // mortality can optionally be provided for transaction expiry. If not provided the transaction will be valid for 250 blocks.
        mortality: {
          // If true, transaction never expires (use with caution)
          // This may be necessary if there is a delay between signing and submitting the transaction.
          // If false (default), transaction expires after 250 blocks (~1 hour)
          immortal: false,
        },
      },
    );

    // Generate a signable payload for offline signing
    const signablePayload = await transferTx.toSignablePayload();
    console.log('\nSignable payload:', signablePayload);

    // ********************************************************************************************************************
    // STEP 3: Sign and submit the transaction
    // This demonstrates two signing approaches:
    // 1. Using the Polkadot ExtrinsicPayload type (recommended for full chain compatibility)
    // 2. Using raw byte signing (useful for custom signing implementations)
    // ********************************************************************************************************************

    // Fetch chain metadata for encoding and decoding transactions. This can be stored off chain. Note: Metadata will
    // change on chain upgrades and needs to match the current chain version or the transaction will fail.
    const metadataOriginal = await fetchChainMetadata();

    // Create a new type registry and set the metadata
    const registry = new TypeRegistry();
    const metadata = new Metadata(registry, metadataOriginal);
    registry.setMetadata(metadata, undefined, undefined, true);

    const {
      rawPayload: { address, data, type },
    } = signablePayload;
    // Create a SCALE encoded extrinsic payload

    const signingPair = keyring.getPair(address);
    // SIGNING METHOD 1: Using Polkadot ExtrinsicPayload
    if (type === 'payload') {
      // The type registry can be used to decode the transaction before signing
      // Decode the transaction call data to human-readable format
      // Useful for verification before signing
      const call = registry.createType('Call', data);

      // The payload must be prefixed with the SCALE encoded length of the payload
      // SCALE encode the payload length and data
      // This format is required by the Polkadot/Substrate transaction format
      const prefixedPayload = u8aConcat(compactToU8a(call.encodedLength), data);
      // Create an extrinsic payload for signing
      const extrinsicPayload = registry.createType(
        'ExtrinsicPayload',
        prefixedPayload,
      );

      console.log('\nGeneric Extrinsic payload:', extrinsicPayload.toHuman());
      console.log(
        '\nPayload Encoded data to be signed:',
        u8aToHex(extrinsicPayload.toU8a(true)),
      );

      // Sign the payload using the keyring pair via the GenericExtrinsicPayload. This step signs
      // the payload and prefixes the signature with the correct prefix based on the key type.
      const { signature } = extrinsicPayload.sign(signingPair);
      console.log('\nSignature:', signature);

      // Create an unsigned extrinsic from the payload
      const extrinsic = registry.createType('Extrinsic', call);
      console.log(
        '\nExtrinsic Unsigned',
        JSON.stringify(extrinsic.toHuman(), null, 2),
      );
      // Add the signature using the extrinsic
      extrinsic.addSignature(
        address,
        signature,
        prefixedPayload, // or extrinsicPayload.toHex()
      );

      console.log('Signed Extrinsic:', extrinsic.toHex());

      // Create a submittable extrinsic
      const transactionRaw = sdk._polkadotApi.tx(extrinsic);
      console.log(
        '\nExtrinsic Signed',
        JSON.stringify(transactionRaw.toHuman(true), null, 2),
      );

      // Send the signed transaction
      await transactionRaw.send(async (result) => {
        console.log(
          '\nTransaction Result:',
          JSON.stringify(result.toHuman(), null, 2),
        );
        if (result.status.isFinalized) {
          console.log(
            `Transaction included in block hash ${result.status.asFinalized.toString()}`,
          );
          console.log(`Transaction hash ${result.txHash.toString()}`);
          console.log('\nDisconnecting from Polymesh...');
          await sdk.disconnect();

          process.exit(0);
        }
      });
    }
    // For raw payloads of types bytes. e.g. a message to confirm a wallet we can instead sign the payload using
    // the keyring pair directly. This is more representative of the steps for a offline signer that does not
    // use the polkadot typeRegister to create a ExtrinsicPayload or Extrinsic type for signing. The steps below
    // are equivalent to extrinsicPayload.sign(signingPair) but without the type registry.
    // `extrinsicPayload.toU8a(true)` is the same as `data` from the rawPayload
    // SIGNING METHOD 2: Raw byte signing
    // This method is useful for custom signing implementations
    if (type === 'bytes') {
      const rawSig = signingPair.sign(hexToU8a(data));
      // Sign raw bytes and add appropriate key type prefix
      // Prefix values:
      // 0x00 = ED25519
      // 0x01 = SR25519
      // 0x02 = ECDSA
      let prefix: Uint8Array = new Uint8Array();
      if (signingPair.type === 'ed25519') {
        prefix = new Uint8Array([0x00]);
      }
      if (signingPair.type === 'sr25519') {
        prefix = new Uint8Array([0x01]);
      }
      if (signingPair.type === 'ecdsa') {
        prefix = new Uint8Array([0x02]);
      }

      const signature = u8aToHex(Uint8Array.of(...prefix, ...rawSig));

      console.log('\nBytes Payload Signature:', signature);

      console.log('\nDisconnecting from Polymesh...');
      await sdk.disconnect();

      process.exit(0);
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
};

main();

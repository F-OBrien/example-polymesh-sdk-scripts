import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { BigNumber, Polymesh } from '@polymeshassociation/polymesh-sdk';
import { handleTxStatusChange } from '../helpers';

// Define the mnemonic and node URL
const ALICE = '//Alice//stash';
const USER1 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//1';
const USER2 =
  'acquire island march famous glad zebra wasp cattle injury drill prefer deer//2';
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

    const signingIdentity = await sdk.getSigningIdentity();
    if (!signingIdentity) throw new Error('No Signing Identity found');
    const identityUser1 = await keys[1].getIdentity();
    if (!identityUser1) throw new Error('Identity not found for user 1');
    const identityUser2 = await keys[2].getIdentity();
    if (!identityUser2) throw new Error('Identity not found for user 2');

    const signerVenue = await signingIdentity.getVenues();
    if (!signerVenue[0])
      throw new Error('No settlement venue found please create one');

    const settlementInstructionTx = await signerVenue[0].addInstruction({
      legs: [
        {
          amount: new BigNumber(25000),
          asset: 'DEMO-CORP',
          from: signingIdentity,
          to: { identity: identityUser1, id: new BigNumber(0) },
        },
        {
          amount: new BigNumber(10500000),
          asset: 'DC-USD',
          from: signingIdentity,
          to: { identity: identityUser1, id: new BigNumber(1) },
        },
        {
          amount: new BigNumber(125000),
          asset: 'DC-USD',
          from: signingIdentity,
          to: { identity: identityUser2, id: new BigNumber(0) },
        },
        {
          asset: 'DC-NOTE-2024',
          from: signingIdentity,
          nfts: [new BigNumber(3)],
          to: { identity: identityUser2, id: new BigNumber(1) },
        },
      ],
    });

    const unsubSettlementInstructionTx =
      settlementInstructionTx.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    const instruction = await settlementInstructionTx.run();
    console.log(
      `Settlement instruction ID ${instruction.id.toNumber()} created`,
    );

    // Unsubscribe from transaction status changes
    unsubSettlementInstructionTx();

    await sdk.setSigningAccount(keys[1]);

    // const user1Instructions = await identityUser1.getInstructions();
    const user1Instruction = await sdk.settlements.getInstruction({
      id: instruction.id,
    });
    // const affirmTx1 = await user1Instructions.pending[0].affirm();
    const affirmTx1 = await user1Instruction.affirm();

    const unsubAffirmTx1 = affirmTx1.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await affirmTx1.run();

    // Unsubscribe from transaction status changes
    unsubAffirmTx1();

    await sdk.setSigningAccount(keys[2]);

    const user2Instruction = await sdk.settlements.getInstruction({
      id: instruction.id,
    });
    const affirmTx2 = await user2Instruction.affirm();

    const unsubAffirmTx2 = affirmTx2.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await affirmTx2.run();

    unsubAffirmTx2();

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

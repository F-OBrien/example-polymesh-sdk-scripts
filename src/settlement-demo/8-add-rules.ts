import { LocalSigningManager } from '@polymeshassociation/local-signing-manager';
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import {
  ClaimType,
  ConditionTarget,
  ConditionType,
  CountryCode,
  ScopeType,
} from '@polymeshassociation/polymesh-sdk/types';
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

    const asset = await sdk.assets.getFungibleAsset({ ticker: ASSET });
    // const addTrustedClaimIssuerTx =
    //   await asset.compliance.trustedClaimIssuers.add({
    //     claimIssuers: [
    //       {
    //         identity: signingIdentity,
    //         trustedFor: [
    //           ClaimType.KnowYourCustomer,
    //           ClaimType.Accredited,
    //           ClaimType.Affiliate,
    //           ClaimType.Blocked,
    //           ClaimType.BuyLockup,
    //           ClaimType.Custom,
    //           ClaimType.Exempted,
    //           ClaimType.Jurisdiction,
    //           ClaimType.SellLockup,
    //         ],
    //       },
    //     ],
    //   });

    const addRuleTx = await asset.compliance.requirements.set({
      requirements: [
        [
          {
            type: ConditionType.IsIdentity,
            identity: signingIdentity,
            target: ConditionTarget.Both,
          },
        ],
        [
          {
            type: ConditionType.IsPresent,
            claim: {
              type: ClaimType.KnowYourCustomer,
              scope: {
                type: ScopeType.Ticker,
                value: ASSET,
              },
            },
            // trustedClaimIssuers: [
            //   { identity: signingIdentity, trustedFor: null },
            // ],
            target: ConditionTarget.Both,
          },
          {
            type: ConditionType.IsPresent,
            claim: {
              type: ClaimType.CustomerDueDiligence,
              id: '0x',
            },
            // trustedClaimIssuers: [
            //   { identity: signingIdentity, trustedFor: null },
            // ],
            target: ConditionTarget.Both,
          },
          // {
          //   type: ConditionType.IsAbsent,
          //   claim: {
          //     type: ClaimType.BuyLockup,
          //     scope: {
          //       type: ScopeType.Identity,
          //       value: signingIdentity.did,
          //     },
          //   },
          //   // trustedClaimIssuers: [
          //   //   { identity: signingIdentity, trustedFor: null },
          //   // ],
          //   target: ConditionTarget.Both,
          // },
          {
            type: ConditionType.IsAbsent,
            claim: {
              type: ClaimType.CustomerDueDiligence,
              id: '0x',
            },
            target: ConditionTarget.Both,
          },
        ],
        // [
        //   {
        //     type: ConditionType.IsPresent,
        //     claim: {
        //       type: ClaimType.Jurisdiction,
        //       code: CountryCode.Ie,
        //       scope: {
        //         type: ScopeType.Custom,
        //         value: 'MY ASSETS',
        //       },
        //     },
        //     // trustedClaimIssuers: [
        //     //   { identity: signingIdentity, trustedFor: null },
        //     // ],
        //     target: ConditionTarget.Both,
        //   },
        // ],
        [
          {
            type: ConditionType.IsAnyOf,
            claims: [
              {
                type: ClaimType.Affiliate,
                scope: {
                  type: ScopeType.Ticker,
                  value: ASSET,
                },
              },
              {
                type: ClaimType.Exempted,
                scope: {
                  type: ScopeType.Ticker,
                  value: ASSET,
                },
              },
              {
                type: ClaimType.CustomerDueDiligence,
                id: '0x',
              },
            ],
            // trustedClaimIssuers: [
            //   { identity: signingIdentity, trustedFor: null },
            // ],
            target: ConditionTarget.Receiver,
          },
          {
            type: ConditionType.IsNoneOf,
            claims: [
              {
                type: ClaimType.Affiliate,
                scope: {
                  type: ScopeType.Ticker,
                  value: ASSET,
                },
              },
              {
                type: ClaimType.Exempted,
                scope: {
                  type: ScopeType.Custom,
                  value: 'MY ASSETS',
                },
              },
              {
                type: ClaimType.CustomerDueDiligence,
                id: '0x',
              },
            ],
            // trustedClaimIssuers: [
            //   { identity: signingIdentity, trustedFor: null },
            // ],
            target: ConditionTarget.Receiver,
          },
        ],
        // [
        //   {
        //     type: ConditionType.IsExternalAgent,
        //     target: ConditionTarget.Receiver,
        //   },
        // ],
        // [
        //   {
        //     type: ConditionType.IsIdentity,
        //     identity: signingIdentity,
        //     target: ConditionTarget.Sender,
        //   },
        // ],
      ],
    });

    const txBatch = await sdk.createTransactionBatch({
      transactions: [
        // addTrustedClaimIssuerTx,
        addRuleTx,
      ],
    });

    const unsubTxBatch = txBatch.onStatusChange(handleTxStatusChange);

    // Execute the batch transaction to add metadata
    await txBatch.run();

    // Unsubscribe from transaction status changes
    unsubTxBatch();

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

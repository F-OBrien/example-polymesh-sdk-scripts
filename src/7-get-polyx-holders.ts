/* eslint-disable no-underscore-dangle */
import { Polymesh } from '@polymeshassociation/polymesh-sdk';
import { balanceToBigNumber } from '@polymeshassociation/polymesh-sdk/utils/conversion';
import fs from 'fs';

const nodeUrl = 'ws://localhost:9944/';

const main = async () => {
  try {
    console.log('Connecting to Polymesh');

    // Connect to the Polymesh blockchain using the SDK
    const sdk = await Polymesh.connect({
      nodeUrl,
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

    const keyRecords =
      await sdk._polkadotApi.query.identity.keyRecords.entries();
    // const apiAtInstance = await sdk._polkadotApi.at(
    //   '0xbd08c6238dd2e04b5293866b31b6f2d6a5c982d597e8538d15a4356210750c83',
    // );
    // const keyRecords = await apiAtInstance.query.identity.keyRecords.entries();

    const keyToIdentityRecord: Record<string, string> = {};

    keyRecords.forEach(
      ([
        {
          args: [accountId],
        },
        keyRecord,
      ]) => {
        if (keyRecord.isSome) {
          const unwrappedRecord = keyRecord.unwrap();
          if (unwrappedRecord.isPrimaryKey) {
            keyToIdentityRecord[accountId.toString()] =
              unwrappedRecord.asPrimaryKey.toString();
          }
          if (unwrappedRecord.isSecondaryKey) {
            keyToIdentityRecord[accountId.toString()] =
              unwrappedRecord.asSecondaryKey[0].toString();
          }
        }
      },
    );

    const accountBalances =
      await sdk._polkadotApi.query.system.account.entries();
    const csvData: object[] = [];

    accountBalances.forEach(
      ([
        {
          args: [accountId],
        },
        accountInfo,
      ]) => {
        csvData.push({
          key: accountId.toString(),
          balance: balanceToBigNumber(accountInfo.data.free).toString(),
          lockedBalance: balanceToBigNumber(
            accountInfo.data.feeFrozen,
          ).toString(),
          did: keyToIdentityRecord[accountId.toString()] || '',
        });
      },
    );

    // Write CSV file
    const csvHeader = Object.keys(csvData[0]).join(',');
    const csvContent = csvData
      .map((row) => Object.values(row).join(','))
      .join('\n');
    const csv = `${csvHeader}\n${csvContent}`;

    fs.writeFileSync('output.csv', csv);

    // Disconnect
    console.log('Disconnecting');
    await sdk.disconnect();

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

main();

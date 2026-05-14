import noble from '@abandonware/noble';
const { Peripheral } = noble;

// Callback for discovered BLE devices
function onDiscover(peripheral) {
  const { id, address, advertisement, rssi } = peripheral;

  if (advertisement) {
    const { localName, txPowerLevel, manufacturerData, serviceData, serviceUuids } = advertisement;

    //if (!localName.startsWith("ESP32")) return;
    
    console.log('Discovered device:');
    console.log(`  ID: ${id}`);
    console.log(`  Address: ${address}`);
    console.log(`  RSSI: ${rssi}`);


    console.log(`  Advertisement:`);
    console.log(`    Local Name: ${localName || 'N/A'}`);
    console.log(`    Tx Power Level: ${txPowerLevel || 'N/A'}`);
    console.log(`    Manufacturer Data: ${manufacturerData?.toString('hex') || 'N/A'}`);
    console.log(`    Manufacturer Data: ${manufacturerData?.toString() || 'N/A'}`);
    console.log(`    Service Data: ${JSON.stringify(serviceData) || 'N/A'}`);
    console.log(`    Service UUIDs: ${serviceUuids || 'N/A'}`);
  }

  console.log('---------------------------------------------');
}

// Handle Noble state changes
noble.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    console.log('Bluetooth adapter powered on. Starting scanning...');
    noble.startScanning([], true);
  } else {
    console.log(`Bluetooth adapter state changed to ${state}. Stopping scanning.`);
    noble.stopScanning();
  }
});

// Listen for device discovery
noble.on('discover', onDiscover);

// Graceful shutdown on process exit
process.on('SIGINT', () => {
  console.log('Stopping scanning...');
  noble.stopScanning(() => {
    process.exit(1);
  });
});


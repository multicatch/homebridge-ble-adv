import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';

import { BLEAdvButtonAccessory } from './platformAccessory.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';

import noble, { Peripheral } from '@abandonware/noble';

const maxLastAdvertisements = 20;
const lastAdvertisements: string[] = [];

function advertisementCleanup() {
  if (lastAdvertisements.length > maxLastAdvertisements) {
    lastAdvertisements.shift();
  }
}

function scanAndNotify(log: Logging, buttons: BLEAdvButtonAccessory[]) {
  // Callback for discovered BLE devices
  const onDiscover = (peripheral: Peripheral) => {
    const { advertisement } = peripheral;

    if (!advertisement) {
      return;
    }

    const { localName, manufacturerData } = advertisement;

    for (const button of buttons) {
      if (button.getBLEDevName() !== localName) {
        continue;
      }

      log.debug('Disovered advertisement by %s', localName);

      const advData = manufacturerData?.toString() || '';
      if (button.getAdvPattern().test(advData)) {
        const repeat = lastAdvertisements.indexOf(advData) >= 0;
        log.debug('Advertisement matched: %s (by %s). Is repeated? %s', advData, localName, repeat);
        if (!repeat) {
          button.triggerEvent(0);
          lastAdvertisements.push(advData);
        }
      } else {
        log.debug('Advertisement NOT matched: %s (by %s)', advData, localName);
      }
    }

    advertisementCleanup();
  };

  noble.on('stateChange', (state: string) => {
    if (state === 'poweredOn') {
      log.info('Bluetooth adapter powered on. Starting scanning...');
      noble.startScanning([], true);
    } else {
      log.warn('Bluetooth adapter state changed to %s. Stopping scanning.', state);
      noble.stopScanning();
    }
  });

  noble.on('discover', onDiscover);

  process.on('SIGINT', () => {
    log.info('Stopping scanning...');
    noble.stopScanning(() => {
      process.exit(1);
    });
  });
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class BLEAdvHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  // This is only required when using Custom Services and Characteristics not support by HomeKit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomServices: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly CustomCharacteristics: any;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      const buttons = this.discoverDevices();
      scanAndNotify(log, buttons);
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  discoverDevices(): BLEAdvButtonAccessory[] {
    const buttons = this.config.buttons;

    const devices = [];
    const configuredButtons: BLEAdvButtonAccessory[] = [];

    for (const aButton of buttons) {
      const uuid = this.api.hap.uuid.generate(aButton.deviceName + aButton.name);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
      } else {
        this.discoveredCacheUUIDs.push(uuid);
      }

      this.log.info('Adding new button: %s', aButton.name);
      const accessory = new this.api.platformAccessory(aButton.name, uuid);
      configuredButtons.push(new BLEAdvButtonAccessory(this.Characteristic, this.Service, accessory, aButton));
      devices.push(accessory);
    }

    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, devices);
    return configuredButtons;
  }
}
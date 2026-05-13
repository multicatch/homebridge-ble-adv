import { Characteristic as ICharacteristic, PlatformAccessory, Service } from 'homebridge';

export interface ButtonConfig {
  name: string;
  deviceName: string,
  buttonPressAdvPattern: string,
};

export class BLEAdvButtonAccessory {
  private service: Service;

  constructor(
    private readonly characteristic: typeof ICharacteristic,
    serviceType: typeof Service,
    private readonly accessory: PlatformAccessory,
    private readonly config: ButtonConfig,
  ) {
    this.service = this.accessory.addService(serviceType.StatelessProgrammableSwitch)!;

    this.service.setCharacteristic(characteristic.Name, config.name);
    this.service.setCharacteristic(characteristic.ConfiguredName, config.name);

    this.service.getCharacteristic(characteristic.ProgrammableSwitchEvent)
      .setProps({
        validValues: [characteristic.ProgrammableSwitchEvent.SINGLE_PRESS],
      });

    this.accessory.getService(serviceType.AccessoryInformation)!
      .setCharacteristic(characteristic.Manufacturer, 'multicatch')
      .setCharacteristic(characteristic.Model, 'Dummy Button')
      .setCharacteristic(characteristic.FirmwareRevision, '1.0.0');
  }

  triggerSinglePress() {
    this.service
      .getCharacteristic(this.characteristic.ProgrammableSwitchEvent)
      .updateValue(
        this.characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
      );
  }

  getBLEDevName(): string {
    return this.config.deviceName;
  }

  getAdvPattern(): RegExp {
    return new RegExp(this.config.buttonPressAdvPattern);
  }
}

const fs = require("fs");
const { Thing, Property, Value, WebThingServer, SingleThing } = require("webthing");
const LCD = require("lcdi2c");
const Gpio = require("onoff").Gpio;

// Constants
const DS18B20_PATH = "/sys/bus/w1/devices/28-2842d446f1da/w1_slave";
const ECHO_PIN = 5;
const TRIGGER_PIN = 6;
const PIEZO_PIN = 16;

// Ensure sensor file exists
if (!fs.existsSync(DS18B20_PATH)) {
  console.error("DS18B20 sensor path does not exist.");
  process.exit(1);
}

// Function to check if a GPIO pin is already exported
const isGpioExported = (pin) => {
  return fs.existsSync(`/sys/class/gpio/gpio${pin}`);
};

// Function to unexport GPIO pins if they are already exported
const unexportGpio = (pin) => {
  try {
    if (isGpioExported(pin)) {
      fs.writeFileSync(`/sys/class/gpio/unexport`, pin.toString());
      console.log(`Unexported GPIO${pin}`);
    } else {
      console.log(`GPIO${pin} is not exported, skipping unexport.`);
    }
  } catch (err) {
    console.error(`Failed to unexport GPIO${pin}:`, err);
  }
};

// Unexport GPIO pins if they are already in use
unexportGpio(TRIGGER_PIN);
unexportGpio(ECHO_PIN);
unexportGpio(PIEZO_PIN);

// GPIO Setup
let TRIG, ECHO, PIEZO;

try {
  if (!isGpioExported(TRIGGER_PIN)) {
    TRIG = new Gpio(TRIGGER_PIN, "out");
  } else {
    console.log(`GPIO${TRIGGER_PIN} is already exported.`);
  }

  if (!isGpioExported(ECHO_PIN)) {
    ECHO = new Gpio(ECHO_PIN, "in", "both");
  } else {
    console.log(`GPIO${ECHO_PIN} is already exported.`);
  }

  if (!isGpioExported(PIEZO_PIN)) {
    PIEZO = new Gpio(PIEZO_PIN, "out");
  } else {
    console.log(`GPIO${PIEZO_PIN} is already exported.`);
  }
} catch (err) {
  console.error("Failed to initialize GPIO pins:", err);
  process.exit(1);
}

class TemperatureSensor extends Thing {
  constructor() {
    super(
      "thermo-reader",
      "Thermo Reader",
      ["TemperatureSensor"],
      "Reads temperature and distance from sensors"
    );

    // Initialize with default thresholds
    this.temperatureThreshold = new Value(17);
    this.distanceThreshold = new Value(120);
    this.piezoEnabled = new Value(true); // Default to enabled

    // Add configurable properties with min/max values
    this.addProperty(
      new Property(this, "temperatureThreshold", this.temperatureThreshold, {
        "@type": "LevelProperty",
        title: "Temperature Threshold",
        type: "number",
        unit: "degree celsius",
        description: "Temperature alert threshold (0-30°C)",
        readOnly: false,
        minimum: 0, // Minimum value
        maximum: 30, // Maximum value
      })
    );

    this.addProperty(
      new Property(this, "distanceThreshold", this.distanceThreshold, {
        "@type": "LevelProperty",
        title: "Distance Threshold",
        type: "number",
        unit: "cm",
        description: "Distance activation threshold (0-250 cm)",
        readOnly: false,
        minimum: 0, // Minimum value
        maximum: 250, // Maximum value
      })
    );

    // Add piezo enabled property
    this.addProperty(
      new Property(this, "piezoEnabled", this.piezoEnabled, {
        "@type": "BooleanProperty",
        title: "Piezo Buzzer Enabled",
        type: "boolean",
        description: "Enable or disable the piezo buzzer",
        readOnly: false,
      })
    );

    // Properties for sensor readings
    this.temperatureValue = new Value(null);
    this.distanceValue = new Value(null);
    this.lastValidDistance = null;

    // Add temperature and distance properties
    this.addProperty(
      new Property(this, "temperature", this.temperatureValue, {
        "@type": "TemperatureProperty",
        title: "Temperature",
        type: "number",
        unit: "degree celsius",
        description: "The temperature in Celsius.",
        readOnly: true,
      })
    );

    this.addProperty(
      new Property(this, "distance", this.distanceValue, {
        "@type": "DistanceProperty",
        title: "Distance (cm)",
        type: "string",
        unit: "cm",
        description: "The distance in centimeters or ∞ if the distance exceeds 300 cm.",
        readOnly: true,
      })
    );

    // Initialize LCD
    this.lcd = new LCD(1, 0x27, 20, 4);
    this.lcd.clear();
    this.lcd.println("Starting...", 1);

    // State variable for buzzer
    this.isBuzzerActive = false;

    // Start sensor updates
    this.startPeriodicUpdates();

    // Start piezo buzzer control
    this.startPiezoControl();
  }

  async startPeriodicUpdates() {
    while (true) {
      try {
        // Update temperature and distance
        await this.updateTemperatureAndDistance();

        // Handle LCD and state logic based on distance
        const distance = this.distanceValue.get();
        const currentDistanceThreshold = this.distanceThreshold.get();

        if (distance === "∞" || distance >= currentDistanceThreshold) {
          this.lcd.off();
          console.log("Switching to OFF state");
        } else if (distance < currentDistanceThreshold) {
          this.lcd.on();
          await this.handleOnState();
        }
      } catch (err) {
        console.error("Error updating temperature or distance:", err);
        this.lcd.clear();
        this.lcd.println("Error reading data", 1);
      }
      await this.delay(1000); // Main loop delay
    }
  }

  async startPiezoControl() {
    while (true) {
      const temperature = this.temperatureValue.get();
      const currentTempThreshold = this.temperatureThreshold.get();
      const isPiezoEnabled = this.piezoEnabled.get();

      if (temperature > currentTempThreshold && isPiezoEnabled && !this.isBuzzerActive) {
        this.isBuzzerActive = true; // Set buzzer state to active
        this.beepPiezo();
      } else if (temperature <= currentTempThreshold || !isPiezoEnabled) {
        this.isBuzzerActive = false; // Set buzzer state to inactive
      }

      await this.delay(100); // Check every 100ms
    }
  }

  async updateTemperatureAndDistance() {
    try {
      const temperature = await this.readTemperature();
      console.log(`Temperature updated: ${temperature}C`);
      this.temperatureValue.notifyOfExternalUpdate(temperature);

      const distance = await this.readDistance();
      console.log(`Distance updated: ${distance}cm`);
      this.distanceValue.notifyOfExternalUpdate(distance);
    } catch (error) {
      console.error("Error reading sensors:", error);
      throw error;
    }
  }

  async handleOnState() {
    const timerInterval = 7000; // 7 seconds
    let elapsedTime = 0;

    while (elapsedTime < timerInterval) {
      await this.updateTemperatureAndDistance();

      const temperature = this.temperatureValue.get();
      const currentTempThreshold = this.temperatureThreshold.get();

      if (temperature > currentTempThreshold) {
        this.displayWarning(temperature);
      } else {
        this.lcd.clear();
        this.lcd.blinkOff();
        this.lcd.println(`Temp: ${temperature}C`, 1); // Restore normal display
      }

      await this.delay(1000);
      elapsedTime += 1000;
    }
  }

  displayWarning(temperature) {
    this.lcd.clear();
    this.lcd.blinkOn();
    this.lcd.println(`Temp: ${temperature}C`, 1);
    this.lcd.println("AVERTISSEMENT!!!", 2);
    this.lcd.println("VEUILLEZ CALIBRER", 3);
    this.lcd.println("POUR REFROIDIR.", 4);
  }

  beepPiezo() {
    if (!this.isBuzzerActive) return; // Ensure buzzer is not already active

    const beepInterval = setInterval(() => {
      if (!this.isBuzzerActive) {
        clearInterval(beepInterval); // Stop beeping if buzzer is turned off
        return;
      }

      PIEZO.writeSync(1); // Turn on the piezo buzzer
      setTimeout(() => {
        PIEZO.writeSync(0); // Turn off the piezo buzzer after 50ms
      }, 50);
    }, 100); // Beep every 100ms
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async readTemperature() {
    try {
      const data = fs.readFileSync(DS18B20_PATH, "utf8");
      const match = data.match(/t=(\d+)/);
      if (match) {
        return parseFloat(match[1]) / 1000;
      }
      throw new Error("Invalid temperature data");
    } catch (error) {
      console.error("Error reading temperature:", error);
      throw error;
    }
  }

  async readDistance() {
    return new Promise((resolve, reject) => {
      TRIG.writeSync(0); // Ensure trigger is off
      setTimeout(() => {
        TRIG.writeSync(1); // Send a 10µs pulse
        setTimeout(() => {
          TRIG.writeSync(0); // Turn off the trigger

          let start = null;
          let end = null;

          const timeout = setTimeout(() => {
            reject(new Error("Distance reading timed out"));
          }, 1000);

          const interval = setInterval(() => {
            const echoValue = ECHO.readSync(); // Read echo pin state

            if (echoValue === 1 && start === null) {
              start = process.hrtime.bigint(); // Record start time
            } else if (echoValue === 0 && start !== null) {
              end = process.hrtime.bigint(); // Record end time
              clearInterval(interval);
              clearTimeout(timeout);

              const duration = Number(end - start) / 1e3; // Convert nanoseconds to microseconds
              const distance = duration / 58.2; // Calculate distance in cm
              resolve(distance > 300 ? "∞" : parseFloat(distance.toFixed(1)).toString()); // Return distance as string
            }
          }, 1);
        }, 10);
      }, 2);
    });
  }
}

// Start the WebThing server
const sensor = new TemperatureSensor();
const server = new WebThingServer(new SingleThing(sensor), 8888);
server.start().catch(console.error);

// Cleanup GPIO on exit
const cleanup = () => {
  TRIG.unexport();
  ECHO.unexport();
  PIEZO.unexport();
  console.log("GPIO cleanup done.");
  process.exit();
};

process.on("SIGINT", cleanup); // Handle Ctrl+C
process.on("SIGTERM", cleanup); // Handle termination signal
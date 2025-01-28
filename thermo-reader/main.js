const fs = require("fs");
const { Thing, Property, Value, WebThingServer, SingleThing } = require("webthing");
const LCD = require("lcdi2c");
const Gpio = require("onoff").Gpio;

// Constants
const DS18B20_PATH = "/sys/bus/w1/devices/28-2842d446f1da/w1_slave";
const THRESHOLD_TEMP = 15;
const DISTANCE_THRESHOLD = 100;
const ECHO_PIN = 5;
const TRIGGER_PIN = 6;

// Ensure sensor file exists
if (!fs.existsSync(DS18B20_PATH)) {
  console.error("DS18B20 sensor path does not exist.");
  process.exit(1);
}

// GPIO Setup
const TRIG = new Gpio(TRIGGER_PIN, "out");
const ECHO = new Gpio(ECHO_PIN, "in", "both");

class TemperatureSensor extends Thing {
  constructor() {
    super(
      "thermo-reader",
      "Thermo Reader",
      ["TemperatureSensor"],
      "Reads temperature and distance from sensors"
    );

    // Properties
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
        readOnly: true
      })
    );

    // Initialize LCD
    this.lcd = new LCD(1, 0x27, 20, 4);
    this.lcd.clear();
    this.lcd.println("Starting...", 1);

    // Start sensor updates
    this.startPeriodicUpdates();
  }

  async startPeriodicUpdates() {
    while (true) {
      try {
        // Update temperature and distance
        await this.updateTemperatureAndDistance();

        // Handle LCD and state logic based on distance
        const distance = this.distanceValue.get();
        if (distance === "∞" || distance >= DISTANCE_THRESHOLD) {
          this.lcd.off();
          console.log("Switching to OFF state");
        } else if (distance < DISTANCE_THRESHOLD) {
          this.lcd.on();
          await this.handleOnState();
        }
      } catch (err) {
        console.error("Error updating temperature or distance:", err);
        this.lcd.clear();
        this.lcd.println("Error reading data", 1);
      }
      await this.delay(1000); // Avoid rapid looping
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
      if (temperature > THRESHOLD_TEMP) {
        this.displayWarning(temperature);
      } else {
        this.lcd.clear();
        this.lcd.blinkOff();
        this.lcd.println(`Temp: ${temperature}C`, 1); // Restored original display for temperature
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
process.on("SIGINT", () => {
  TRIG.unexport();
  ECHO.unexport();
  console.log("GPIO cleanup done.");
  process.exit();
});
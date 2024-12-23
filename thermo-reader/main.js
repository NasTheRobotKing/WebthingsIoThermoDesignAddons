const fs = require("fs");
const {
  Thing,
  Property,
  Value,
  WebThingServer,
  SingleThing,
} = require("webthing");
const LCD = require("lcdi2c"); // Add the lcdi2c library

const DS18B20_PATH = "/sys/bus/w1/devices/28-2842d446f1da/w1_slave";
const THRESHOLD_TEMP = 15;
let warningCleared = false;

class TemperatureSensor extends Thing {
  constructor() {
    super(
      "thermo-reader",
      "Temperature Reader",
      ["TemperatureSensor"],
      "Reads temperature from a DS18B20 sensor"
    );

    // Create a Value object to store the temperature
    this.temperatureValue = new Value(null);

    // Add the temperature property to the Thing
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

    // Initialize the LCD
    this.lcd = new LCD(1, 0x27, 20, 4); // I2C address 0x27, 20 columns, 4 rows
    this.lcd.clear();
    this.lcd.println("Starting...", 1);

    // Start periodic updates for the temperature
    this.startPeriodicUpdates();
  }

  async startPeriodicUpdates() {
    setInterval(async () => {
      try {
        const temperature = await readTemperature();
        console.log("THERMO-READER -> Temperature updated:", temperature);

        this.temperatureValue.set(temperature); // Update the Value
        //this.previousTemp = roundedTemp; // Store the new temperature

        // Display the temperature with blinking if needed
        if (temperature > THRESHOLD_TEMP) {
          warningCleared = false;
          // Blink the temperature
          this.blinkTemperature(temperature);
          // Display warning message after blinking
          this.displayWarning();

          //this.lcd.clear();
        } else {
          // Clear the warning if temperature is below or equal to 15
          if (!warningCleared) {
            this.clearWarning();
            warningCleared = true;
            this.lcd.blinkOff();
          }

          this.lcd.println(`Temp: ${temperature}C    `, 1);
        }
      } catch (err) {
        console.error("THERMO-READER -> Error updating temperature:", err);

        // Display an error on the LCD
        this.lcd.clear();
        this.lcd.println("Error reading temp", 1);
      }
    }, 3000); // Update every 3 seconds
  }

  blinkTemperature(temperature) {
    // Blink the temperature on the LCD
    this.lcd.clear();
    this.lcd.blinkOn();
    this.lcd.println(`Temp: ${temperature}C    `, 1);
  }

  displayWarning() {
    // Write the warning message directly to the specific lines
    this.lcd.println("AVERTISSEMENT!!!", 2);
    this.lcd.println("VEUILLEZ CALIBRER", 3);
    this.lcd.println("POUR REFROIDIR.", 4);
  }

  clearWarning() {
    // Clear the entire LCD screen before writing new content
    this.lcd.clear();
    // Now display the warning lines again, ensuring no cursor at the end
    this.lcd.println(" ".repeat(20), 2); // Clear line 2
    this.lcd.println(" ".repeat(20), 3); // Clear line 3
    this.lcd.println(" ".repeat(20), 4); // Clear line 4
  }

  // Helper function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Function to read the temperature from the DS18B20 sensor
function readTemperature() {
  return new Promise((resolve, reject) => {
    fs.readFile(DS18B20_PATH, "utf8", (err, data) => {
      if (err) {
        reject(`Error reading temperature sensor: ${err}`);
        return;
      }

      const matches = data.match(/t=(\d+)/);
      if (matches && matches[1]) {
        resolve(parseInt(matches[1], 10) / 1000.0);
      } else {
        reject("Unable to parse temperature data.");
      }
    });
  });
}

// Verify that the sensor path exists before starting
if (!fs.existsSync(DS18B20_PATH)) {
  console.error("THERMO-READER -> Error: DS18B20 sensor path does not exist.");
  process.exit(1);
}

const temperatureSensorThing = new TemperatureSensor();
const server = new WebThingServer(
  new SingleThing(temperatureSensorThing),
  8888
);

server
  .start()
  .then(() => {
    console.log(
      "THERMO-READER -> Thermo reader add-on server running on port 8888."
    );
  })
  .catch((err) => {
    console.error("THERMO-READER -> Failed to start server:", err);
  });

process.on("uncaughtException", (err) => {
  console.error("THERMO-READER -> Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "THERMO-READER -> Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
});

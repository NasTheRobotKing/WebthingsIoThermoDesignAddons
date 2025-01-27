const fs = require("fs");
const { Thing, Property, Value, WebThingServer, SingleThing } = require("webthing");
const LCD = require("lcdi2c");
const Gpio = require("onoff").Gpio;

const DS18B20_PATH = "/sys/bus/w1/devices/28-2842d446f1da/w1_slave";
const THRESHOLD_TEMP = 15;
const DISTANCE_THRESHOLD = 100;
let warningCleared = false;

const ECHO_PIN = 5;
const TRIGGER_PIN = 6;

const TRIG = new Gpio(TRIGGER_PIN, 'out');
const ECHO = new Gpio(ECHO_PIN, 'in', 'both');

class TemperatureSensor extends Thing {
  constructor() {
    super(
      "thermo-reader",
      "Thermo Reader",
      ["TemperatureSensor"],
      "Reads temperature from a DS18B20 sensor"
    );

    this.temperatureValue = new Value(null);
    this.distanceValue = new Value(null);

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
        title: "Distance",
        type: "number",
        unit: "cm",
        description: "The distance in centimeters.",
        readOnly: true,
      })
    );

    this.lcd = new LCD(1, 0x27, 20, 4);
    this.lcd.clear();
    this.lcd.println("Starting...", 1);

    this.startPeriodicUpdates();
  }

  async startPeriodicUpdates() {
    let state = "OFF";   
    while(true){
      try {
        const temperature = await readTemperature();
        console.log(`THERMO-READER -> Temperature updated: ${temperature}C`);
        this.temperatureValue.set(temperature);
        
        const distance = await this.readDistance();
        console.log("THERMO-READER -> Distance updated:", distance);
        this.distanceValue.set(distance);

        if (distance < DISTANCE_THRESHOLD) {
          state = "ON";
          this.lcd.on();
          await this.startOnStateTimer();
        } else {
          state = "OFF";
          console.log("Switching to OFF state");
          await this.delay(500);
          this.lcd.off();
        }
      } catch (err) {
        console.error("THERMO-READER -> Error updating temperature or distance:", err);
        this.lcd.clear();
        this.lcd.println("Error reading data", 1);
      }
    }
  }

  async startOnStateTimer() {
    const timerInterval = 7000; // 7 seconds interval timer
    let elapsedTime = 0;
  
    // Loop every second until "timerInterval" seconds have passed
    while (elapsedTime < timerInterval) {
      const temperature = await readTemperature();
      console.log(`THERMO-READER -> Temperature updated: ${temperature}C, Elapsed Time: ${elapsedTime}ms`);
      this.temperatureValue.set(temperature); // Update the Value

      const distance = await this.readDistance();
      console.log("THERMO-READER -> Distance updated:", distance);
      this.distanceValue.set(distance);
  
      // Display the temperature with blinking if needed
      if (temperature > THRESHOLD_TEMP) {
        warningCleared = false;
        // Blink the temperature
        this.blinkTemperature(temperature);
        // Display warning message after blinking
        this.displayWarning();
      } else {
        // Clear the warning if temperature is below or equal to 15
        if (!warningCleared) {
          this.clearWarning();
          warningCleared = true;
          this.lcd.blinkOff();
        }
  
        this.lcd.println(`Temp: ${temperature}C    `, 1);
      }
  
      // Wait for 1 second (1000 milliseconds) before next loop
      await this.delay(1000);
      elapsedTime += 1000;
    }
  
    console.log("30 seconds elapsed, checking distance again...");
  }
  
  // Helper function for delays
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  blinkTemperature(temperature) {
    // Blink the temperature on the LCD
    this.lcd.clear();
    this.lcd.blinkOn();
    this.lcd.println(`Temp: ${temperature}C    `, 1);
  }

  displayWarning() {
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

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async readDistance() {
    return new Promise((resolve) => {
      TRIG.writeSync(0);
      setTimeout(() => {
        TRIG.writeSync(1);
        setTimeout(() => {
          TRIG.writeSync(0);
          const startTime = process.hrtime();
          let start = 0;
          let end = 0;

          const interval = setInterval(() => {
            if (ECHO.readSync() === 1 && start === 0) {
              start = process.hrtime(startTime);
            } else if (ECHO.readSync() === 0 && start !== 0) {
              end = process.hrtime(startTime);
              clearInterval(interval);
              const timeDiff = end[0] * 1e6 + end[1] / 1e3;
              const distance = (timeDiff / 2) / 29.1;
              resolve(distance.toFixed(2));
            }
          }, 1);
        }, 10);
      }, 2);
    });
  }
}

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

if (!fs.existsSync(DS18B20_PATH)) {
  console.error("THERMO-READER -> Error: DS18B20 sensor path does not exist.");
  process.exit(1);
}

const temperatureSensorThing = new TemperatureSensor();
const server = new WebThingServer(new SingleThing(temperatureSensorThing), 8888);
server.start();

process.on('SIGINT', () => {
  TRIG.unexport();
  ECHO.unexport();
  console.log('GPIO cleanup done.');
  process.exit();
});

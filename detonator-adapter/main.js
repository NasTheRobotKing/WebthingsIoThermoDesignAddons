// Import required libraries
const {
    WebThingServer,
    SingleThing,
    Thing,
    Property,
    Value,
} = require("webthing");
const LCD = require("lcdi2c");
const Gpio = require("onoff").Gpio;

// GPIO Pin for the piezo buzzer
const PIEZO_PIN = 16;

// Create a class for the LCD Adapter
class LCDAdapter {
    constructor() {
        // Initialize the LCD screen
        this.lcd = new LCD(1, 0x27, 20, 4); // I2C address 0x27, 20 columns, 4 rows

        // Initialize the piezo buzzer
        this.piezo = new Gpio(PIEZO_PIN, "out");

        // Initialize the LCD screen with default text
        this.lcd.clear();
        this.lcd.print("WebThing Ready");
    }

    displayText(line1, line2, line3) {
        // Clear the screen
        this.lcd.clear();

        // Display text on each line
        this.lcd.println(line1, 1); // Line 1
        this.lcd.println(line2, 2); // Line 2
        this.lcd.println(line3, 3); // Line 3
    }

    startCountdown() {
        let count = 10;
        const countdownInterval = setInterval(() => {
            if (count >= 0) {
                this.displayText("DETONATION SEQUENCE", "BEGINS", `COUNTDOWN: ${count}`);
                this.beepLong(); // Beep long every second
                count--;
            } else {
                clearInterval(countdownInterval);
                this.displayText("DETONATION SEQUENCE", "BEGINS", "BOOM!");
                this.beepFast(); // Beep really fast at the end
            }
        }, 1000);
    }

    beepLong() {
        this.piezo.writeSync(1); // Turn on the piezo buzzer
        setTimeout(() => {
            this.piezo.writeSync(0); // Turn off the piezo buzzer after 500ms
        }, 500);
    }

    beepFast() {
        let beepCount = 0;
        const fastBeepInterval = setInterval(() => {
            if (beepCount < 10) { // Beep 10 times
                this.piezo.writeSync(1); // Turn on the piezo buzzer
                setTimeout(() => {
                    this.piezo.writeSync(0); // Turn off the piezo buzzer after 100ms
                }, 100);
                beepCount++;
            } else {
                clearInterval(fastBeepInterval); // Stop beeping after 10 beeps
            }
        }, 200); // Beep every 200ms
    }

    cleanup() {
        this.piezo.writeSync(0); // Ensure the buzzer is off
        this.piezo.unexport(); // Cleanup GPIO
        this.lcd.close(); // Close the LCD
    }
}

// Create a new WebThing for the LCD Adapter
class LCDThing extends Thing {
    constructor() {
        super(
            "urn:dev:ops:lcd-display-1",
            "LCD Display",
            ["TextDisplay"],
            "An LCD display for showing text."
        );

        // Initialize the LCD Adapter
        this.lcdAdapter = new LCDAdapter();

        // Define a property for the button
        this.buttonPressed = new Value(false, (value) => {
            console.log("Button pressed:", value);
            if (value) {
                this.lcdAdapter.displayText("DETONATION SEQUENCE", "BEGINS", "COUNTDOWN: 10");
                this.lcdAdapter.startCountdown();
            }
        });

        // Add the button property to the thing
        this.addProperty(
            new Property(this, "buttonPressed", this.buttonPressed, {
                type: "boolean",
                title: "Button Pressed",
                description: "Press the button to start the detonation sequence.",
            })
        );
    }
}

// Start the WebThing server
async function startServer() {
    const lcdThing = new LCDThing();
    const server = new WebThingServer(new SingleThing(lcdThing), 8800);

    process.on("SIGINT", () => {
        console.log("Shutting down...");
        lcdThing.lcdAdapter.cleanup(); // Cleanup GPIO and LCD
        server.stop();
        process.exit();
    });

    await server.start();
    console.log("WebThing server running on port 8800");
}

startServer().catch((err) => {
    console.error("Failed to start the WebThing server:", err);
    process.exit(1);
});
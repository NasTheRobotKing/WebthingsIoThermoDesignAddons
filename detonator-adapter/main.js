// Import required libraries
const {
    WebThingServer,
    SingleThing,
    Thing,
    Property,
    Value,
} = require("webthing");
const LCD = require("lcdi2c");

// Create a class for the LCD Adapter
class LCDAdapter {
    constructor() {
        // Initialize the LCD screen
        this.lcd = new LCD(1, 0x27, 20, 4); // I2C address 0x27, 20 columns, 4 rows

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
        const interval = setInterval(() => {
            if (count >= 0) {
                this.displayText("DETONATION SEQUENCE", "BEGINS", `COUNTDOWN: ${count}`);
                count--;
            } else {
                clearInterval(interval);
                this.displayText("DETONATION SEQUENCE", "BEGINS", "BOOM!");
            }
        }, 1000);
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
        lcdThing.lcdAdapter.lcd.close();
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
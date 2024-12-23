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
    this.lcd = new LCD(1, 0x27, 20, 4); // I2C address 0x27, 16 columns, 2 rows

    // Initialize the LCD screen with default text
    this.lcd.clear();
    this.lcd.print("WebThing Ready");
  }

  displayText(text) {
    this.lcd.clear();
    this.lcd.print(text);
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

    // Define a property for displaying text
    this.text = new Value("WebThings", (value) => {
      console.log("Text updated:", value);
      this.lcdAdapter.displayText(value);
    });

    // Add the text property to the thing
    this.addProperty(
      new Property(this, "text", this.text, {
        type: "string",
        title: "Display Text",
        description: "Text to display on the LCD screen.",
      })
    );
  }
}

// Start the WebThing server
async function startServer() {
  const lcdThing = new LCDThing();
  const server = new WebThingServer(new SingleThing(lcdThing), 8889);

  process.on("SIGINT", () => {
    console.log("Shutting down...");
    lcdThing.lcdAdapter.lcd.close();
    server.stop();
    process.exit();
  });

  await server.start();
  console.log("WebThing server running on port 8889");
}

startServer().catch((err) => {
  console.error("Failed to start the WebThing server:", err);
  process.exit(1);
});

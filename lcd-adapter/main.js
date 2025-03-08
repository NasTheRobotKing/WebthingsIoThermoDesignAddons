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

  displayText(text) {
    // Clear the screen
    this.lcd.clear();

    // Split text into lines based on the LCD width
    const lines = this.splitTextToLines(text, 20);

    // Write each line to the corresponding LCD row
    lines.forEach((line, index) => {
      if (index < 4) {
        this.lcd.println(line, index + 1); // Print the line on the specific row
      }
    });
  }

  splitTextToLines(text, lineWidth) {
    const lines = [];
    for (let i = 0; i < text.length; i += lineWidth) {
      lines.push(text.substring(i, i + lineWidth));
    }
    return lines;
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

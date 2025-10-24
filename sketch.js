// --- Configuration ---
let symmetry = 12;
let angle = 360 / symmetry;
let drawRadius; // Radius of the circular drawing area (set in setup)
let vinylDiscDiameter; // Diameter of the outer "vinyl" circle (set in setup)

// --- Drawer Objects ---
let mouseDrawer;
let autoDrawer; // This will be an instance of a ProceduralDrawer subclass
let symmetrySlider; // Variable for the new slider
let autoPauseButton;
let autoPaused = false;

// Global canvas size (accessible anywhere)
let w = 1000;
let vinylSlider;
let vinylValueSpan;

// --- Global Color Palette ---
let hexPalette = [
	"#232327ff", // raisin-black
	"#A7A5A3ff", // silver
	"#E5E5E3ff", // platinum
	"#131213ff", // night
	"#32384Dff", // space-cadet
	"#959494ff"  // battleship-gray
];

// Class: Mouse-driven drawer
class MouseDrawer {
	constructor() {
		// No longer needs symmetry argument
		// this.symmetry and this.angle removed, will use global vars

		// --- New Color Palette Logic ---
		// Use the global hexPalette declared above and convert to p5.Color objects
		this.palette = hexPalette.map((c) => color(c));

		this.colorInterpolation = 0; // Tracks our position in the palette
		this.colorInterpolationSpeed = 0.01; // How fast to cycle (lower is slower)
		// --- End New Color Logic ---
	}

	// We'll call this from the main draw() loop
	draw() {
		// Only draw if the mouse is pressed and inside the canvas
		if (
			mouseIsPressed === true &&
			mouseX > 0 &&
			mouseX < width &&
			mouseY > 0 &&
			mouseY < height
		) {
			// Get mouse coordinates relative to the center
			let lineStartX = mouseX - width / 2;
			let lineStartY = mouseY - height / 2;
			let lineEndX = pmouseX - width / 2;
			let lineEndY = pmouseY - height / 2;

			// --- Calculate the interpolated color ---
			// Increment our interpolation value
			this.colorInterpolation += this.colorInterpolationSpeed;

			// Wrap the value so it stays within the palette's bounds
			let t = this.colorInterpolation % this.palette.length;

			// Find the two colors to blend between
			let color1Index = floor(t);
			let color2Index = (color1Index + 1) % this.palette.length; // Wrap around

			// Find the blend amount (the fractional part of t)
			let interpolationFactor = t - color1Index;

			// Get the two colors from our palette
			let color1 = this.palette[color1Index];
			let color2 = this.palette[color2Index];

			// Calculate the final blended color
			let currentColor = lerpColor(color1, color2, interpolationFactor);
			// --- End Color Calculation ---

			// The kaleidoscope drawing loop
			// Use the global 'symmetry' and 'angle' variables which are updated by the slider
			for (let i = 0; i < symmetry; i++) {
				rotate(angle);

				// Use the new interpolated color instead of random
				stroke(currentColor);
				strokeWeight(1.5);
				line(lineStartX, lineStartY, lineEndX, lineEndY);

				// Draw the reflected line
				push();
				scale(1, -1);
				line(lineStartX, lineStartY, lineEndX, lineEndY);
				pop();
			}
		}
	}
}

/**
 * Class 2: "Abstract" base class for procedural drawing.
 * It defines the methods that concrete drawers must implement.
 */
class ProceduralDrawer {
	constructor() {
		// Constructor is empty, setup happens in subclasses
	}

	// Update the drawer's internal state (e.g., position)
	update() {
		throw new Error("Method 'update()' must be implemented by subclass");
	}

	// Draw the content to the canvas
	draw() {
		throw new Error("Method 'draw()' must be implemented by subclass");
	}
}

/**
 * Class 3: Concrete Sinusoidal Drawer
 * Extends ProceduralDrawer to draw patterns using sin() and cos().
 */
// Small helper class that represents a single sinusoidal component
class SinusoidalWave {
	constructor(radius = 0, freq = 1, phase = 0, phaseInc = undefined, mode = 'sin') {
		this.radius = radius;
		this.freq = freq;
		this.phase = phase;
		// If phaseInc isn't provided, choose a small random drift when constructed
		this.phaseInc = phaseInc !== undefined ? phaseInc : random(0.0005, 0.005);
		// mode = 'sin' or 'cos' (controls which trig function to use)
		this.mode = mode;
	}

	value(t) {
		if (this.mode === 'sin') return sin(t * this.freq + this.phase) * this.radius;
		return cos(t * this.freq + this.phase) * this.radius;
	}

	incrementPhase() {
		this.phase += this.phaseInc;
	}

	setPhaseInc(v) {
		this.phaseInc = v;
	}
}

class SinusoidalDrawer extends ProceduralDrawer {
	/**
	 * Create a new SinusoidalDrawer.
	 * Accepts an optional options object so it can be instantiated in one line.
	 * Example: new SinusoidalDrawer({ tIncrement: 0.05, f1: 2.0, palette: ['#111','#222'] })
	 */
	constructor(opts = {}) {
		super(); // Call the parent constructor

		// --- Sinusoidal Wave Setup ---
		this.pos = createVector(0, 0);
		this.prevPos = createVector(0, 0);
		this.t = opts.t !== undefined ? opts.t : 0; // Our time variable

		// Removed stray closing brace

		// How fast to move through the waves (can be controlled by draw speed slider)
		// Preserve the file's previous default if not provided
		this.tIncrement = opts.tIncrement !== undefined ? opts.tIncrement : 10;

		// Radii and frequencies for the sine/cosine waves.
		// Based on drawRadius to scale with the drawing area, overridable via opts
		this.r1 = opts.r1 !== undefined ? opts.r1 : drawRadius * 0.4;
		this.r2 = opts.r2 !== undefined ? opts.r2 : drawRadius * 0.4;
		this.f1 = opts.f1 !== undefined ? opts.f1 : 1.0;
		this.f2 = opts.f2 !== undefined ? opts.f2 : 2.5;

		this.r3 = opts.r3 !== undefined ? opts.r3 : drawRadius * 0.4;
		this.r4 = opts.r4 !== undefined ? opts.r4 : drawRadius * 0.4;
		this.f3 = opts.f3 !== undefined ? opts.f3 : 1.5;
		this.f4 = opts.f4 !== undefined ? opts.f4 : 3.0;

		// --- Phase offsets for each sinusoid so they don't all align ---
		if (opts.phases && opts.phases.length >= 4) {
			this.phi1 = opts.phases[0];
			this.phi2 = opts.phases[1];
			this.phi3 = opts.phases[2];
			this.phi4 = opts.phases[3];
		} else {
			this.phi1 = random(0, TWO_PI);
			this.phi2 = random(0, TWO_PI);
			this.phi3 = random(0, TWO_PI);
			this.phi4 = random(0, TWO_PI);
		}

		// Small per-wave phase increment speeds so phases slowly change over time
		if (opts.phiIncs && opts.phiIncs.length >= 4) {
			this.phiInc1 = opts.phiIncs[0];
			this.phiInc2 = opts.phiIncs[1];
			this.phiInc3 = opts.phiIncs[2];
			this.phiInc4 = opts.phiIncs[3];
		} else {
			this.phiInc1 =
				opts.phiInc1 !== undefined ? opts.phiInc1 : random(0.0005, 0.005);
			this.phiInc2 =
				opts.phiInc2 !== undefined ? opts.phiInc2 : random(0.0005, 0.005);
			this.phiInc3 =
				opts.phiInc3 !== undefined ? opts.phiInc3 : random(0.0005, 0.005);
			this.phiInc4 =
				opts.phiInc4 !== undefined ? opts.phiInc4 : random(0.0005, 0.005);
		}
		// --- End Sinusoidal Setup ---

		// Create SinusoidalWave instances for x and y components
		this.wave1 = new SinusoidalWave(this.r1, this.f1, this.phi1, this.phiInc1, 'sin');
		this.wave2 = new SinusoidalWave(this.r2, this.f2, this.phi2, this.phiInc2, 'sin');
		this.wave3 = new SinusoidalWave(this.r3, this.f3, this.phi3, this.phiInc3, 'cos');
		this.wave4 = new SinusoidalWave(this.r4, this.f4, this.phi4, this.phiInc4, 'cos');

		// --- Color Palette Logic (copied from MouseDrawer) ---
		// Use provided palette or fall back to global hexPalette
		let usedHexPalette =
			opts.palette && opts.palette.length ? opts.palette : hexPalette;
		this.palette = usedHexPalette.map((c) => color(c));
		this.colorInterpolation =
			opts.colorInterpolation !== undefined ? opts.colorInterpolation : 0;
		this.colorInterpolationSpeed =
			opts.colorInterpolationSpeed !== undefined
				? opts.colorInterpolationSpeed
				: 0.01;
		// --- End Color Logic ---
	}

	// Update the position based on the sum of sine/cosine waves
	update() {
		// If auto-draw is paused, do not advance the state
		if (autoPaused) return;
		// Store the old position
		this.prevPos.set(this.pos);

		// Calculate new x and y using the SinusoidalWave instances
		let x = this.wave1.value(this.t) + this.wave2.value(this.t);
		let y = this.wave3.value(this.t) + this.wave4.value(this.t);

		this.pos.set(x, y);

		// Increment time
		this.t += this.tIncrement;

		// Increment individual wave phases so things slowly drift
		this.wave1.incrementPhase();
		this.wave2.incrementPhase();
		this.wave3.incrementPhase();
		this.wave4.incrementPhase();
	}

	// Draw the line from the previous position to the new position
	draw() {
		this.update(); // Update the position first

		// Don't draw on the very first frame, just set the prevPos
		if (this.t <= this.tIncrement) {
			this.prevPos.set(this.pos);
			return;
		}

		// --- Calculate Color (copied from MouseDrawer) ---
		this.colorInterpolation += this.colorInterpolationSpeed;
		let t_color = this.colorInterpolation % this.palette.length;
		let color1Index = floor(t_color);
		let color2Index = (color1Index + 1) % this.palette.length;
		let interpolationFactor = t_color - color1Index;
		let color1 = this.palette[color1Index];
		let color2 = this.palette[color2Index];
		let currentColor = lerpColor(color1, color2, interpolationFactor);
		// --- End Color Calculation ---

		// The kaleidoscope drawing loop
		for (let i = 0; i < symmetry; i++) {
			rotate(angle);

			stroke(currentColor);
			strokeWeight(1.5);
			line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);

			// Draw the reflected line
			push();
			scale(1, -1);
			line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);
			pop();
		}
	}
}

// --- Main p5.js Functions ---

function setup() {
	// Create buttons *before* the canvas to place them on top
	let btnMouse = createButton("Mouse Draw");
	btnMouse.mousePressed(setMouseDrawer);

	let btnAuto = createButton("Auto Draw");
	btnAuto.mousePressed(setAutoDrawer);

	// Create Pause/Play button for auto draw
	autoPauseButton = createButton("Pause Auto");
	autoPauseButton.mousePressed(toggleAutoPause);

	// Create Clear button
	let btnClear = createButton("Clear");
	btnClear.mousePressed(clearCanvas);

	// --- Create Slider with Label and Value ---
	// Create a container div for the slider UI
	let sliderDiv = createDiv();
	sliderDiv.style("margin-top", "10px"); // Add space below buttons
	sliderDiv.style("display", "flex"); // Arrange items horizontally
	sliderDiv.style("align-items", "center"); // Vertically center items

	// Create the text label
	let labelSpan = createSpan("Symmetry: ");
	labelSpan.parent(sliderDiv);

	// Create the symmetry slider
	// (Min 2, Max 24, Default 'symmetry' value (12), Step 1)
	symmetrySlider = createSlider(2, 24, symmetry, 1);
	symmetrySlider.parent(sliderDiv);
	symmetrySlider.style("margin", "0 10px"); // Add horizontal spacing

	// Create the span to display the slider's value
	let valueSpan = createSpan(symmetry);
	valueSpan.parent(sliderDiv);

	// Add an event listener to update the valueSpan whenever the slider moves
	symmetrySlider.input(() => {
		valueSpan.html(symmetrySlider.value());
	});

	// --- Color Rate Slider (controls colorInterpolationSpeed) ---
	let colorDiv = createDiv();
	colorDiv.style("margin-top", "8px");
	colorDiv.style("display", "flex");
	colorDiv.style("align-items", "center");

	let colorLabel = createSpan("Color rate: ");
	colorLabel.parent(colorDiv);

	// Min 0, Max 0.2, default 0.01, step 0.005
	colorRateSlider = createSlider(0, 0.2, 0.01, 0.005);
	colorRateSlider.parent(colorDiv);
	colorRateSlider.style("margin", "0 10px");

	colorRateValueSpan = createSpan(colorRateSlider.value());
	colorRateValueSpan.parent(colorDiv);

	colorRateSlider.input(() => {
		colorRateValueSpan.html(nf(colorRateSlider.value(), 0, 3));
	});

	// --- Draw Speed Slider (controls tIncrement for auto drawer) ---
	let speedDiv = createDiv();
	speedDiv.style("margin-top", "8px");
	speedDiv.style("display", "flex");
	speedDiv.style("align-items", "center");

	let speedLabel = createSpan("Draw speed: ");
	speedLabel.parent(speedDiv);

	// Min 0 (paused via pause button), Max 1.0, default 0.01, step 0.005
	drawSpeedSlider = createSlider(0, 1.0, 0.01, 0.005);
	drawSpeedSlider.parent(speedDiv);
	drawSpeedSlider.style("margin", "0 10px");

	drawSpeedValueSpan = createSpan(drawSpeedSlider.value());
	drawSpeedValueSpan.parent(speedDiv);

	drawSpeedSlider.input(() => {
		drawSpeedValueSpan.html(nf(drawSpeedSlider.value(), 0, 3));
	});
	// --- End Slider UI ---

	createCanvas(w, w);
	angleMode(DEGREES);

	// --- Vinyl Size Slider ---
	let vinylDiv = createDiv();
	vinylDiv.style("margin-top", "8px");
	vinylDiv.style("display", "flex");
	vinylDiv.style("align-items", "center");

	let vinylLabel = createSpan("Vinyl size: ");
	vinylLabel.parent(vinylDiv);

	// Range 0.5 to 1.0 (percentage of canvas), default 0.85
	vinylSlider = createSlider(0.5, 1.0, 0.85, 0.01);
	vinylSlider.parent(vinylDiv);
	vinylSlider.style("margin", "0 10px");

	vinylValueSpan = createSpan(nf(vinylSlider.value(), 0, 2));
	vinylValueSpan.parent(vinylDiv);

	vinylSlider.input(() => {
		vinylValueSpan.html(nf(vinylSlider.value(), 0, 2));
		// Update diameters and drawRadius live
		vinylDiscDiameter = vinylSlider.value() * width;
		drawRadius = vinylDiscDiameter / 2;
		clearCanvas();
	});

	// Initialize vinyl diameter and drawRadius from slider default
	vinylDiscDiameter = vinylSlider.value() * width;
	drawRadius = vinylDiscDiameter / 2;

	// Set colorMode to HSB for the procedural drawer's smooth colors
	// Max Hue: 360, Max Sat: 100, Max Bright: 100
	// Note: colorMode(HSB) is fine. The MouseDrawer's color()
	// function will correctly parse the hex codes regardless.
	colorMode(HSB, 360, 100, 100);

	// Create instances of both drawers
	mouseDrawer = new MouseDrawer();
	autoDrawer = new SinusoidalDrawer(); // Changed to the new concrete class

	// Set the mouse-drawer as the default one to start
	currentDrawer = mouseDrawer;

	clearCanvas(); // Use the new function to set the background
	// Note: clearCanvas() is called *after* drawers are created
	// so that drawRadius is defined when the SinusoidalDrawer constructor runs.
}

function draw() {
	// --- Update symmetry from slider ---
	// Read the slider's value on every frame
	symmetry = symmetrySlider.value();
	angle = 360 / symmetry;
	// --- End update ---

	// Move 0,0 to the center (all drawers assume this)
	translate(width / 2, height / 2);

	// --- Create a circular clipping mask ---
	// This restricts all drawing to a circle.
	drawingContext.save(); // Save the current drawing state
	drawingContext.beginPath();
	// Create an arc at 0,0 (which is the center) with our radius
	// This now perfectly matches the white label circle
	drawingContext.arc(0, 0, drawRadius, 0, TWO_PI, true);
	drawingContext.clip(); // Apply the clip

	// Call the draw method of whichever drawer is active
	// It will now use the updated global 'symmetry' and 'angle'
	// Update drawers' colorInterpolationSpeed from the slider so it's live
	let newColorRate = colorRateSlider ? colorRateSlider.value() : 0.01;
	if (mouseDrawer) mouseDrawer.colorInterpolationSpeed = newColorRate;
	if (autoDrawer) autoDrawer.colorInterpolationSpeed = newColorRate;

	// Update draw speed for auto drawer from slider
	let newDrawSpeed = drawSpeedSlider ? drawSpeedSlider.value() : 0.01;
	if (autoDrawer) autoDrawer.tIncrement = newDrawSpeed;

	currentDrawer.draw();

	// --- End of clipped drawing ---
	drawingContext.restore(); // Restore the drawing state (remove clip)
}

// --- Button and Key-press Helper Functions ---

// Switch to mouse drawer
function setMouseDrawer() {
	currentDrawer = mouseDrawer;
	clearCanvas();
}

// Switch to auto drawer
function setAutoDrawer() {
	// We must re-create the auto-drawer instance when switching
	// to reset its position and time.
	autoDrawer = new SinusoidalDrawer();
	currentDrawer = autoDrawer;
	clearCanvas();
}

// Toggle pause/play for the auto drawer
function toggleAutoPause() {
	autoPaused = !autoPaused;
	autoPauseButton.html(autoPaused ? "Play Auto" : "Pause Auto");
}

// Clear the canvas and draw the "vinyl record" background
function clearCanvas() {
	push(); // Save current style settings
	resetMatrix(); // Ensure we draw from the top-left (0,0)

	// 1. Draw the "album cover" background
	background(30);

	// 2. Draw the dark "vinyl" disc using the new variable
	fill(50); // Restored this value to 50
	noStroke();
	circle(width / 2, height / 2, vinylDiscDiameter);


	pop(); // Restore style settings
}

// Keep the 'c' key as a shortcut to clear
function keyPressed() {
	if (key === "c" || key === "C") {
		clearCanvas(); // Use the new function
	}
}

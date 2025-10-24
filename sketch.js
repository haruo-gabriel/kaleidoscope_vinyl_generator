// --- Configuration ---
let symmetry = 12;
let angle = 360 / symmetry;
let drawRadius; // Radius of the circular drawing area (set in setup)
let vinylDiscDiameter; // Diameter of the outer "vinyl" circle (set in setup)

// --- Drawer Objects ---
let mouseDrawer;
let autoDrawer; // This will be an instance of a ProceduralDrawer subclass
let symmetrySlider; // Variable for the new slider
let strokeWeightSlider; // Slider to control stroke weight
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
	"#959494ff", // battleship-gray
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
				// Use the live stroke weight from the slider if available
				strokeWeight(strokeWeightSlider ? strokeWeightSlider.value() : 1.5);
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
class SinusoidalDrawer extends ProceduralDrawer {
	// Internal helper class that represents a single sinusoidal component
	static SinusoidalWave = class {
		constructor(
			radius = 0,
			freq = 1,
			phase = 0,
			phaseInc = undefined,
			mode = "sin"
		) {
			this.radius = radius;
			this.freq = freq;
			this.phase = phase;
			// If phaseInc isn't provided, choose a small random drift when constructed
			this.phaseInc = phaseInc !== undefined ? phaseInc : random(0.0005, 0.005);
			// mode = 'sin' or 'cos' (controls which trig function to use)
			this.mode = mode;
		}

		value(t) {
			if (this.mode === "sin")
				return sin(t * this.freq + this.phase) * this.radius;
			return cos(t * this.freq + this.phase) * this.radius;
		}

		incrementPhase() {
			this.phase += this.phaseInc;
		}

		setPhaseInc(v) {
			this.phaseInc = v;
		}
	};

	/**
	 * Create a new SinusoidalDrawer.
	 * Accepts an optional options object so it can be instantiated in one line.
	 *
	 * Options:
	 *   - tIncrement: speed of wave progression (default 10)
	 *   - xWaves: array of wave configs for x-axis (each has radius, freq, phase?, phaseInc?, mode?)
	 *   - yWaves: array of wave configs for y-axis (each has radius, freq, phase?, phaseInc?, mode?)
	 *   - palette: array of hex color strings
	 *   - colorInterpolation, colorInterpolationSpeed: color cycling params
	 *
	 * Legacy options (r1, r2, f1, f2, r3, r4, f3, f4, phases, phiIncs) still supported for backward compatibility.
	 *
	 * Example: new SinusoidalDrawer({
	 *   tIncrement: 0.05,
	 *   xWaves: [{radius: 100, freq: 1.0}, {radius: 100, freq: 2.5}],
	 *   yWaves: [{radius: 100, freq: 1.5}, {radius: 100, freq: 3.0}]
	 * })
	 */
	constructor(opts = {}) {
		super(); // Call the parent constructor

		// --- Sinusoidal Wave Setup ---
		this.pos = createVector(0, 0);
		this.prevPos = createVector(0, 0);
		this.t = opts.t !== undefined ? opts.t : 0; // Our time variable

		// How fast to move through the waves (can be controlled by draw speed slider)
		this.tIncrement = opts.tIncrement !== undefined ? opts.tIncrement : 10;

		// --- Generalized Wave Instantiation ---
		// Always use default waves
		this.xWaves = this._createWavesFromConfig([
			{ radius: drawRadius * 1.0, freq: 10.0, phaseInc: 0.1, mode: "sin" },
			// { radius: drawRadius * 0.4, freq: 10.0, mode: "sin" },
		]);
		this.yWaves = this._createWavesFromConfig([
			// { radius: drawRadius * 0.4, freq: 10.0, mode: "cos" },
			// { radius: drawRadius * 0.4, freq: 10.0, mode: "cos" },
		]);

		// --- Color Palette Logic ---
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

	/**
	 * Helper method to create wave instances from a config array.
	 * Each config object should have: { radius, freq, phase?, phaseInc?, mode? }
	 */
	_createWavesFromConfig(configs) {
		return configs.map((cfg) => {
			const radius = cfg.radius !== undefined ? cfg.radius : drawRadius * 0.4;
			const freq = cfg.freq !== undefined ? cfg.freq : 1.0;
			const phase = cfg.phase !== undefined ? cfg.phase : random(0, TWO_PI);
			const phaseInc =
				cfg.phaseInc !== undefined ? cfg.phaseInc : random(0.0005, 0.005);
			const mode = cfg.mode !== undefined ? cfg.mode : "sin";
			return new SinusoidalDrawer.SinusoidalWave(
				radius,
				freq,
				phase,
				phaseInc,
				mode
			);
		});
	}

	// Update the position based on the sum of sine/cosine waves
	update() {
		// If auto-draw is paused, do not advance the state
		if (autoPaused) return;
		// Store the old position
		this.prevPos.set(this.pos);

		// Calculate new x and y by summing all wave contributions
		let x = 0;
		for (let wave of this.xWaves) {
			x += wave.value(this.t);
		}

		let y = 0;
		for (let wave of this.yWaves) {
			y += wave.value(this.t);
		}

		this.pos.set(x, y);

		// Increment time
		this.t += this.tIncrement;

		// Increment individual wave phases so things slowly drift
		for (let wave of this.xWaves) {
			wave.incrementPhase();
		}
		for (let wave of this.yWaves) {
			wave.incrementPhase();
		}
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
			// Use the live stroke weight from the slider if available
			strokeWeight(strokeWeightSlider ? strokeWeightSlider.value() : 1.5);
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
	symmetrySlider = createSlider(2, 32, symmetry, 1);
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
	colorRateSlider = createSlider(0, 0.9, 0.5, 0.005);
	colorRateSlider.parent(colorDiv);
	colorRateSlider.style("margin", "0 10px");

	colorRateValueSpan = createSpan(colorRateSlider.value());
	colorRateValueSpan.parent(colorDiv);

	colorRateSlider.input(() => {
		colorRateValueSpan.html(nf(colorRateSlider.value(), 0, 3));
	});

	// --- Stroke Weight Slider (controls strokeWeight for all drawers) ---
	let swDiv = createDiv();
	swDiv.style("margin-top", "8px");
	swDiv.style("display", "flex");
	swDiv.style("align-items", "center");

	let swLabel = createSpan("Stroke weight: ");
	swLabel.parent(swDiv);

	// Range 0.1 to 10.0, default 1.5, step 0.1
	strokeWeightSlider = createSlider(0.1, 10.0, 3, 0.1);
	strokeWeightSlider.parent(swDiv);
	strokeWeightSlider.style("margin", "0 10px");

	let swValueSpan = createSpan(strokeWeightSlider.value());
	swValueSpan.parent(swDiv);

	strokeWeightSlider.input(() => {
		swValueSpan.html(nf(strokeWeightSlider.value(), 0, 1));
	});

	// --- Draw Speed Slider (controls tIncrement for auto drawer) ---
	let speedDiv = createDiv();
	speedDiv.style("margin-top", "8px");
	speedDiv.style("display", "flex");
	speedDiv.style("align-items", "center");

	let speedLabel = createSpan("Draw speed: ");
	speedLabel.parent(speedDiv);

	// Min 0 (paused via pause button), Max 10.0 (faster), default 0.01, step 0.005
	// Note: default remains small so auto-draw is smooth; users can increase up to 10 for faster motion
	drawSpeedSlider = createSlider(0, 10.0, 5, 0.005);
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
	autoDrawer = new SinusoidalDrawer();

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

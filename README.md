# Fun Phonics Adventure

This simple webapp presents phonics stories that can be read aloud using the browser's Speech Synthesis API.

## Quick Start

Run a local web server in this folder so the stories load correctly. For example:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser. If the stories fail to load, make sure you launched the server and didn't open `index.html` directly from the filesystem.

## Running the App

Because the app loads data with `fetch`, it must be served over HTTP. If you open `index.html` directly from the filesystem the stories will fail to load.

Use a small local server instead:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Files
- `index.html` – main page
- `script.js` – logic and interactions
- `styles.css` – styling
- `passages.json` – story data
- `images/` – illustrations

# Role
You are a Senior Front-End Developer specializing in Music Theory logic and Web Audio API (Tone.js).

# Context
We have the HTML and CSS (Glassmorphism design) ready. Now we need the logic to make it functional.

# Functional Requirements

## 1. Fretboard Rendering Engine
- **Target:** The Fretboard container in the HTML.
- **Logic:** Write a function `renderFretboard()` that dynamically generates 6 strings and 22 frets. 
- **Coordinates:** Each accessible note position must have data attributes like `data-string="6"` and `data-fret="3"`.

## 2. Music Theory Module (Chord Logic)
- **Chord Database/Algorithm:** - Implement a mapping system that translates a Chord Name (e.g., "C Major", "Am7") into an array of `{string, fret}` coordinates.
    - *Advanced:* If possible, calculate intervals programmatically instead of hard-coding every chord image.
- **Song Search Simulation:**
    - Create a function `mockSongSearch(songTitle)`.
    - Since we cannot access a live API, return a mock JSON object.
    - Example: If input is "Let It Be", return `['C', 'G', 'Am', 'F']`.
    - When a song is selected, the UI should cycle through these chords or present them as clickable buttons.

## 3. Audio Engine (Tone.js)
- **Library:** Use `Tone.js` (assume it is imported via CDN in HTML).
- **Synth:** Create a PolySynth or use Samples that sound like an Electric Guitar.
- **Interaction:**
    - **Click:** Clicking a specific string/fret should play that specific pitch.
    - **Strum:** Create a "Strum" button that iterates through the active notes of the current chord and plays them with a slight delay (arpeggiated) to simulate a guitar pick sweeping across strings.
    - **Visual Sync:** When a sound plays, trigger the CSS `vibrate` class on the corresponding string element.

# Deliverable for Implementation Phase
Please write the **`script.js`** file. 
- Ensure the code is modular and commented.
- Handle the logic for "Input Chord Name" -> "Highlight Dots on Fretboard".
- Handle the logic for "Input Song Name" -> "Show Chord Progression List".
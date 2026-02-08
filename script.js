/* ================================
   GUITAR FRETBOARD VISUALIZER
   JavaScript Implementation
   ================================ */

// ================================
// CONFIGURATION
// ================================
const CONFIG = {
    strings: 6,
    frets: 22,
    stringNotes: ['E', 'A', 'D', 'G', 'B', 'E'], // Low E to High E (string 6 to string 1)
    markerFrets: [3, 5, 7, 9, 12, 15, 17, 19, 21], // Standard fret marker positions
    doubleMarkerFrets: [12], // Double dot positions
};

// Note names for calculating pitches
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Open string note indices (for calculating notes at each fret)
const OPEN_STRING_NOTES = {
    6: 4,  // E
    5: 9,  // A
    4: 2,  // D
    3: 7,  // G
    2: 11, // B
    1: 4,  // E (high)
};

// ================================
// STATE MANAGEMENT
// ================================
const state = {
    activeNotes: [], // Array of {string, fret, isRoot} objects
    currentChord: null,
    useFlats: false,
    soundEnabled: true,  // Sound toggle
    // Progression state
    progression: {
        chords: [],           // Array of chord names
        voicings: [],         // Array of voicing arrays (optimized positions)
        currentIndex: 0,      // Current chord index
        isPlaying: false,     // Auto-play state
        tempo: 80,            // BPM
        beatsPerChord: 2,     // Beats before changing chord
        loopEnabled: true,    // Loop at end
    },
};

// ================================
// TONE.JS AUDIO ENGINE
// ================================

let guitarSynth = null;
let audioStarted = false;

/**
 * Guitar string frequencies (standard tuning, open strings)
 * String 6 (low E) = E2, String 1 (high E) = E4
 */
const STRING_FREQUENCIES = {
    6: 'E2',   // Low E - 82.41 Hz
    5: 'A2',   // A - 110.00 Hz
    4: 'D3',   // D - 146.83 Hz
    3: 'G3',   // G - 196.00 Hz
    2: 'B3',   // B - 246.94 Hz
    1: 'E4',   // High E - 329.63 Hz
};

/**
 * Initialize the Tone.js guitar synth
 */
function initAudio() {
    if (guitarSynth) return;
    
    // Create a plucked string synth using PluckSynth
    guitarSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
            type: 'fmtriangle',
            modulationType: 'sine',
            modulationIndex: 2,
            harmonicity: 1
        },
        envelope: {
            attack: 0.005,
            decay: 0.3,
            sustain: 0.2,
            release: 1.2
        }
    }).toDestination();
    
    // Add some reverb for a more natural guitar sound
    const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.2
    }).toDestination();
    
    guitarSynth.connect(reverb);
    
    console.log('Guitar synth initialized');
}

/**
 * Start audio context (required after user interaction)
 */
async function startAudio() {
    if (audioStarted) return;
    
    try {
        await Tone.start();
        audioStarted = true;
        initAudio();
        console.log('Audio context started');
    } catch (error) {
        console.error('Failed to start audio:', error);
    }
}

/**
 * Calculate the frequency/note for a specific string and fret
 * @param {number} stringNum - String number (1-6)
 * @param {number} fretNum - Fret number (0-22)
 * @returns {string} Note name with octave (e.g., 'E4', 'F#3')
 */
function getFrequencyAtPosition(stringNum, fretNum) {
    const openNote = STRING_FREQUENCIES[stringNum];
    if (!openNote) return 'C4'; // fallback
    
    // Parse the open string note and octave
    const notePart = openNote.slice(0, -1);
    const octave = parseInt(openNote.slice(-1));
    
    // Get semitones from open string
    const openNoteIndex = NOTE_NAMES.indexOf(notePart.replace('#', '').replace('b', ''));
    const actualNoteIndex = (openNoteIndex + fretNum) % 12;
    const octaveIncrease = Math.floor((openNoteIndex + fretNum) / 12);
    
    // Build the note name
    const noteName = NOTE_NAMES[actualNoteIndex];
    const finalOctave = octave + octaveIncrease;
    
    return `${noteName}${finalOctave}`;
}

/**
 * Play a single note
 * @param {number} stringNum - String number (1-6)
 * @param {number} fretNum - Fret number (0-22)
 * @param {number} duration - Duration in seconds (default: 1)
 */
function playNote(stringNum, fretNum, duration = 1) {
    if (!state.soundEnabled) return;
    
    startAudio().then(() => {
        if (!guitarSynth) return;
        
        const note = getFrequencyAtPosition(stringNum, fretNum);
        guitarSynth.triggerAttackRelease(note, duration);
        
        console.log(`Playing: String ${stringNum}, Fret ${fretNum} = ${note}`);
    });
}

/**
 * Play multiple notes simultaneously (chord)
 * @param {Array} positions - Array of {string, fret} objects
 * @param {number} duration - Duration in seconds
 */
function playChord(positions, duration = 1.5) {
    if (!state.soundEnabled || positions.length === 0) return;
    
    startAudio().then(() => {
        if (!guitarSynth) return;
        
        const notes = positions.map(pos => getFrequencyAtPosition(pos.string, pos.fret));
        guitarSynth.triggerAttackRelease(notes, duration);
        
        console.log('Playing chord:', notes);
    });
}

/**
 * Strum the active chord (play notes in sequence from low to high)
 * @param {string} direction - 'down' (low to high) or 'up' (high to low)
 * @param {number} strumSpeed - Time between each note in ms (default: 30)
 */
function strumChord(direction = 'down', strumSpeed = 30) {
    if (!state.soundEnabled || state.activeNotes.length === 0) return;
    
    startAudio().then(() => {
        if (!guitarSynth) return;
        
        // Sort notes by string number
        const sortedNotes = [...state.activeNotes].sort((a, b) => {
            // For down strum: low strings (6) first
            // For up strum: high strings (1) first
            return direction === 'down' ? b.string - a.string : a.string - b.string;
        });
        
        // Play each note with a slight delay
        sortedNotes.forEach((pos, index) => {
            setTimeout(() => {
                const note = getFrequencyAtPosition(pos.string, pos.fret);
                guitarSynth.triggerAttackRelease(note, 1.2);
                vibrateString(pos.string);
            }, index * strumSpeed);
        });
        
        console.log(`Strumming ${direction}:`, sortedNotes.length, 'notes');
    });
}

/**
 * Toggle sound on/off
 */
function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    
    // Update button state
    document.querySelectorAll('.control-btn').forEach(btn => {
        if (btn.querySelector('.btn-label')?.textContent === 'Sound') {
            btn.classList.toggle('active', state.soundEnabled);
        }
    });
    
    console.log('Sound:', state.soundEnabled ? 'ON' : 'OFF');
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get the note name at a specific string and fret position
 * @param {number} stringNum - String number (1-6, where 6 is low E)
 * @param {number} fretNum - Fret number (0-22, where 0 is open string)
 * @returns {string} Note name (e.g., 'C', 'F#', 'Bb')
 */
function getNoteAtPosition(stringNum, fretNum) {
    const openNoteIndex = OPEN_STRING_NOTES[stringNum];
    const noteIndex = (openNoteIndex + fretNum) % 12;
    let noteName = NOTE_NAMES[noteIndex];
    
    // Convert sharps to flats if needed
    if (state.useFlats && noteName.includes('#')) {
        const flatMap = {
            'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
        };
        noteName = flatMap[noteName] || noteName;
    }
    
    return noteName;
}

/**
 * Generate a unique ID for a fret position
 * @param {number} stringNum - String number
 * @param {number} fretNum - Fret number
 * @returns {string} Unique identifier
 */
function getPositionId(stringNum, fretNum) {
    return `s${stringNum}f${fretNum}`;
}

// ================================
// FRETBOARD RENDERING ENGINE
// ================================

/**
 * Dynamically renders the complete guitar fretboard
 * Creates strings, frets, markers, and clickable note positions
 */
function renderFretboard() {
    const fretboardContainer = document.getElementById('fretboard');
    if (!fretboardContainer) {
        console.error('Fretboard container not found');
        return;
    }

    // Clear existing content
    fretboardContainer.innerHTML = '';

    // Create fret numbers row
    const fretNumbers = createFretNumbers();
    fretboardContainer.appendChild(fretNumbers);

    // Create the main fretboard element
    const fretboard = document.createElement('div');
    fretboard.className = 'fretboard';

    // Add nut (the bar at fret 0)
    const nut = document.createElement('div');
    nut.className = 'nut';
    fretboard.appendChild(nut);

    // Add frets
    const fretsContainer = createFrets();
    fretboard.appendChild(fretsContainer);

    // Add fret markers (dots)
    const markersContainer = createFretMarkers();
    fretboard.appendChild(markersContainer);

    // Add strings
    const stringsContainer = createStrings();
    fretboard.appendChild(stringsContainer);

    // Add string labels (E A D G B e)
    const stringLabels = createStringLabels();
    fretboard.appendChild(stringLabels);

    // Add clickable note positions grid
    const noteGrid = createNoteGrid();
    fretboard.appendChild(noteGrid);

    fretboardContainer.appendChild(fretboard);

    console.log('Fretboard rendered successfully');
}

/**
 * Creates the fret number indicators above the fretboard
 * @returns {HTMLElement} Fret numbers container
 */
function createFretNumbers() {
    const container = document.createElement('div');
    container.className = 'fret-numbers';

    for (let fret = 0; fret <= CONFIG.frets; fret++) {
        const fretNum = document.createElement('span');
        fretNum.className = 'fret-number';
        fretNum.textContent = fret;
        container.appendChild(fretNum);
    }

    return container;
}

/**
 * Creates the metal fret bars
 * @returns {HTMLElement} Frets container
 */
function createFrets() {
    const container = document.createElement('div');
    container.className = 'frets';

    for (let fret = 1; fret <= CONFIG.frets; fret++) {
        const fretElement = document.createElement('div');
        fretElement.className = 'fret';
        fretElement.dataset.fret = fret;
        container.appendChild(fretElement);
    }

    return container;
}

/**
 * Creates the inlay markers (dots) on the fretboard using flex layout
 * @returns {HTMLElement} Markers container
 */
function createFretMarkers() {
    const container = document.createElement('div');
    container.className = 'fret-markers';

    // Create a space for each fret (1-22), markers only appear at specific frets
    for (let fret = 1; fret <= CONFIG.frets; fret++) {
        const markerSpace = document.createElement('div');
        markerSpace.className = 'marker-space';
        markerSpace.dataset.fret = fret;

        // Add dot marker at specific frets
        if (CONFIG.markerFrets.includes(fret)) {
            if (CONFIG.doubleMarkerFrets.includes(fret)) {
                // Double marker (12th fret) - two dots
                markerSpace.classList.add('double');
                const marker1 = document.createElement('div');
                marker1.className = 'marker';
                const marker2 = document.createElement('div');
                marker2.className = 'marker';
                markerSpace.appendChild(marker1);
                markerSpace.appendChild(marker2);
            } else {
                // Single marker
                const marker = document.createElement('div');
                marker.className = 'marker';
                markerSpace.appendChild(marker);
            }
        }

        container.appendChild(markerSpace);
    }

    return container;
}

/**
 * Creates the guitar strings with varying thickness
 * String 1 (High E, thinnest) at top, String 6 (Low E, thickest) at bottom
 * @returns {HTMLElement} Strings container
 */
function createStrings() {
    const container = document.createElement('div');
    container.className = 'strings';

    // Create strings from 1 (high E, top) to 6 (low E, bottom)
    for (let stringNum = 1; stringNum <= CONFIG.strings; stringNum++) {
        const string = document.createElement('div');
        string.className = `string string-${stringNum}`;
        string.dataset.string = stringNum;
        string.dataset.note = CONFIG.stringNotes[CONFIG.strings - stringNum];
        
        // Add click handler for string (plays open string)
        string.addEventListener('click', (e) => {
            handleStringClick(stringNum, e);
        });

        container.appendChild(string);
    }

    return container;
}

/**
 * Creates the string note labels (e B G D A E from top to bottom)
 * @returns {HTMLElement} String labels container
 */
function createStringLabels() {
    const container = document.createElement('div');
    container.className = 'string-labels';

    // Reverse the order: show e (high E) at top, E (low E) at bottom
    const reversedNotes = [...CONFIG.stringNotes].reverse();
    reversedNotes.forEach((note, index) => {
        const label = document.createElement('span');
        label.className = 'string-label';
        // Use lowercase 'e' for high E string (first in reversed array)
        label.textContent = index === 0 ? note.toLowerCase() : note;
        container.appendChild(label);
    });

    return container;
}

/**
 * Creates an invisible grid of clickable note positions
 * String 1 (High E) at top, String 6 (Low E) at bottom
 * @returns {HTMLElement} Note grid container
 */
function createNoteGrid() {
    const container = document.createElement('div');
    container.className = 'note-grid';

    // Create rows from string 1 (high E, top) to string 6 (low E, bottom)
    for (let stringNum = 1; stringNum <= CONFIG.strings; stringNum++) {
        const stringRow = document.createElement('div');
        stringRow.className = 'note-row';
        stringRow.dataset.string = stringNum;

        for (let fret = 0; fret <= CONFIG.frets; fret++) {
            const notePosition = document.createElement('div');
            notePosition.className = 'note-position';
            notePosition.id = getPositionId(stringNum, fret);
            notePosition.dataset.string = stringNum;
            notePosition.dataset.fret = fret;
            notePosition.dataset.note = getNoteAtPosition(stringNum, fret);

            // Add click handler
            notePosition.addEventListener('click', () => {
                handleNoteClick(stringNum, fret);
            });

            stringRow.appendChild(notePosition);
        }

        container.appendChild(stringRow);
    }

    return container;
}

// ================================
// NOTE HIGHLIGHTING SYSTEM
// ================================

/**
 * Highlights a specific position on the fretboard
 * @param {number} stringNum - String number (1-6)
 * @param {number} fretNum - Fret number (0-22)
 * @param {Object} options - Highlight options
 * @param {boolean} options.isRoot - Whether this is a root note (amber glow)
 * @param {string} options.label - Optional label to display on the marker
 */
function highlightPosition(stringNum, fretNum, options = {}) {
    const { isRoot = false, label = null } = options;
    
    const positionId = getPositionId(stringNum, fretNum);
    const notePosition = document.getElementById(positionId);
    
    if (!notePosition) {
        console.warn(`Position not found: string ${stringNum}, fret ${fretNum}`);
        return;
    }

    // Check if marker already exists
    let marker = notePosition.querySelector('.note-marker');
    
    if (!marker) {
        // Create new marker
        marker = document.createElement('div');
        marker.className = 'note-marker';
        notePosition.appendChild(marker);
    }

    // Set marker state
    marker.classList.add('active');
    marker.classList.toggle('root', isRoot);

    // Set label (note name or custom)
    const noteName = label || getNoteAtPosition(stringNum, fretNum);
    marker.textContent = noteName;
    marker.title = `${noteName} - String ${stringNum}, Fret ${fretNum}`;

    // Add to active notes state
    const noteData = { string: stringNum, fret: fretNum, isRoot };
    if (!state.activeNotes.find(n => n.string === stringNum && n.fret === fretNum)) {
        state.activeNotes.push(noteData);
    }

    return marker;
}

/**
 * Removes highlight from a specific position
 * @param {number} stringNum - String number (1-6)
 * @param {number} fretNum - Fret number (0-22)
 */
function clearPosition(stringNum, fretNum) {
    const positionId = getPositionId(stringNum, fretNum);
    const notePosition = document.getElementById(positionId);
    
    if (notePosition) {
        const marker = notePosition.querySelector('.note-marker');
        if (marker) {
            marker.remove();
        }
    }

    // Remove from active notes state
    state.activeNotes = state.activeNotes.filter(
        n => !(n.string === stringNum && n.fret === fretNum)
    );
}

/**
 * Clears all highlighted positions on the fretboard
 */
function clearAllHighlights() {
    const markers = document.querySelectorAll('.note-marker');
    markers.forEach(marker => marker.remove());
    state.activeNotes = [];
    state.currentChord = null;
    console.log('All highlights cleared');
}

/**
 * Highlights multiple positions at once (for chords)
 * @param {Array} positions - Array of {string, fret, isRoot} objects
 */
function highlightChord(positions) {
    // Clear existing highlights first
    clearAllHighlights();
    
    // Highlight each position
    positions.forEach(pos => {
        highlightPosition(pos.string, pos.fret, {
            isRoot: pos.isRoot || false
        });
    });

    console.log(`Highlighted ${positions.length} positions`);
}

// ================================
// EVENT HANDLERS
// ================================

/**
 * Handles click on a note position
 * @param {number} stringNum - String number
 * @param {number} fretNum - Fret number
 */
function handleNoteClick(stringNum, fretNum) {
    const note = getNoteAtPosition(stringNum, fretNum);
    console.log(`Clicked: String ${stringNum}, Fret ${fretNum}, Note: ${note}`);
    
    // Toggle highlight on click
    const positionId = getPositionId(stringNum, fretNum);
    const notePosition = document.getElementById(positionId);
    const existingMarker = notePosition?.querySelector('.note-marker');
    
    if (existingMarker) {
        clearPosition(stringNum, fretNum);
    } else {
        highlightPosition(stringNum, fretNum);
    }

    // Play sound
    playNote(stringNum, fretNum);
    
    // Trigger string vibration animation
    vibrateString(stringNum);
}

/**
 * Handles click on a string (open string)
 * @param {number} stringNum - String number
 * @param {Event} event - Click event
 */
function handleStringClick(stringNum, event) {
    // Prevent triggering note click
    event.stopPropagation();
    
    const note = getNoteAtPosition(stringNum, 0);
    console.log(`String ${stringNum} clicked (Open ${note})`);
    
    // Play open string sound
    playNote(stringNum, 0);
    
    // Trigger vibration animation
    vibrateString(stringNum);
}

// ================================
// ANIMATION HELPERS
// ================================

/**
 * Triggers the vibrate animation on a string
 * @param {number} stringNum - String number (1-6)
 */
function vibrateString(stringNum) {
    const string = document.querySelector(`.string-${stringNum}`);
    if (string) {
        // Remove class if already animating
        string.classList.remove('vibrating');
        
        // Trigger reflow to restart animation
        void string.offsetWidth;
        
        // Add vibrating class
        string.classList.add('vibrating');
        
        // Remove class after animation completes
        setTimeout(() => {
            string.classList.remove('vibrating');
        }, 300);
    }
}

// ================================
// CONTROL PANEL HANDLERS
// ================================

/**
 * Toggles between sharps and flats notation
 * @param {boolean} useFlats - Whether to use flats
 */
function setNotationMode(useFlats) {
    state.useFlats = useFlats;
    
    // Update button states
    document.querySelectorAll('.control-btn').forEach(btn => {
        if (btn.querySelector('.btn-label')?.textContent === 'Sharps') {
            btn.classList.toggle('active', !useFlats);
        }
        if (btn.querySelector('.btn-label')?.textContent === 'Flats') {
            btn.classList.toggle('active', useFlats);
        }
    });

    // Re-render active notes with new notation
    const currentNotes = [...state.activeNotes];
    clearAllHighlights();
    currentNotes.forEach(pos => {
        highlightPosition(pos.string, pos.fret, { isRoot: pos.isRoot });
    });
}

/**
 * Initializes control panel button handlers
 */
function initControlPanel() {
    const controls = document.querySelectorAll('.control-btn');
    
    controls.forEach(btn => {
        const label = btn.querySelector('.btn-label')?.textContent;
        
        btn.addEventListener('click', () => {
            switch (label) {
                case 'Sharps':
                    setNotationMode(false);
                    break;
                case 'Flats':
                    setNotationMode(true);
                    break;
                case 'Clear':
                    clearAllHighlights();
                    break;
                case 'Sound':
                    toggleSound();
                    break;
                case 'Strum':
                    strumChord('down');
                    break;
            }
        });
    });
    
    // Set initial sound button state
    const soundBtn = document.getElementById('sound-btn');
    if (soundBtn) {
        soundBtn.classList.toggle('active', state.soundEnabled);
    }
}

// ================================
// INITIALIZATION
// ================================

/**
 * Initialize the application
 */
function init() {
    console.log('Initializing Guitar Fretboard Visualizer...');
    
    // Render the fretboard
    renderFretboard();
    
    // Initialize control panel
    initControlPanel();
    
    // Initialize search functionality
    initSearch();
    
    console.log('Initialization complete!');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// ================================
// CHORD THEORY & PARSING
// ================================

/**
 * Chord intervals in semitones from root
 */
const CHORD_INTERVALS = {
    // Triads
    'major': [0, 4, 7],           // 1, 3, 5
    'minor': [0, 3, 7],           // 1, b3, 5
    'dim': [0, 3, 6],             // 1, b3, b5
    'aug': [0, 4, 8],             // 1, 3, #5
    
    // Seventh chords
    'maj7': [0, 4, 7, 11],        // 1, 3, 5, 7
    '7': [0, 4, 7, 10],           // 1, 3, 5, b7 (dominant 7th)
    'm7': [0, 3, 7, 10],          // 1, b3, 5, b7
    'dim7': [0, 3, 6, 9],         // 1, b3, b5, bb7
    'm7b5': [0, 3, 6, 10],        // 1, b3, b5, b7 (half-diminished)
    'mMaj7': [0, 3, 7, 11],       // 1, b3, 5, 7
    'aug7': [0, 4, 8, 10],        // 1, 3, #5, b7
    
    // Extended chords
    '9': [0, 4, 7, 10, 14],       // 1, 3, 5, b7, 9
    'maj9': [0, 4, 7, 11, 14],    // 1, 3, 5, 7, 9
    'm9': [0, 3, 7, 10, 14],      // 1, b3, 5, b7, 9
    'add9': [0, 4, 7, 14],        // 1, 3, 5, 9
    '6': [0, 4, 7, 9],            // 1, 3, 5, 6
    'm6': [0, 3, 7, 9],           // 1, b3, 5, 6
    
    // Suspended chords
    'sus2': [0, 2, 7],            // 1, 2, 5
    'sus4': [0, 5, 7],            // 1, 4, 5
    '7sus4': [0, 5, 7, 10],       // 1, 4, 5, b7
};

/**
 * Common chord voicings (open and barre positions)
 * Format: {strings: [s6, s5, s4, s3, s2, s1], rootString: number, baseFret: number}
 * -1 = muted/not played, 0 = open string
 */
const CHORD_SHAPES = {
    // Open chord shapes (moveable patterns)
    'E_major': { strings: [0, 2, 2, 1, 0, 0], rootString: 6, baseFret: 0 },
    'E_minor': { strings: [0, 2, 2, 0, 0, 0], rootString: 6, baseFret: 0 },
    'A_major': { strings: [-1, 0, 2, 2, 2, 0], rootString: 5, baseFret: 0 },
    'A_minor': { strings: [-1, 0, 2, 2, 1, 0], rootString: 5, baseFret: 0 },
    'D_major': { strings: [-1, -1, 0, 2, 3, 2], rootString: 4, baseFret: 0 },
    'D_minor': { strings: [-1, -1, 0, 2, 3, 1], rootString: 4, baseFret: 0 },
    'C_major': { strings: [-1, 3, 2, 0, 1, 0], rootString: 5, baseFret: 0 },
    'G_major': { strings: [3, 2, 0, 0, 0, 3], rootString: 6, baseFret: 0 },
    
    // 7th chord shapes
    'E_7': { strings: [0, 2, 0, 1, 0, 0], rootString: 6, baseFret: 0 },
    'E_m7': { strings: [0, 2, 0, 0, 0, 0], rootString: 6, baseFret: 0 },
    'E_maj7': { strings: [0, 2, 1, 1, 0, 0], rootString: 6, baseFret: 0 },
    'A_7': { strings: [-1, 0, 2, 0, 2, 0], rootString: 5, baseFret: 0 },
    'A_m7': { strings: [-1, 0, 2, 0, 1, 0], rootString: 5, baseFret: 0 },
    'A_maj7': { strings: [-1, 0, 2, 1, 2, 0], rootString: 5, baseFret: 0 },
    'D_7': { strings: [-1, -1, 0, 2, 1, 2], rootString: 4, baseFret: 0 },
    'D_m7': { strings: [-1, -1, 0, 2, 1, 1], rootString: 4, baseFret: 0 },
    
    // Barre chord templates (E-shape and A-shape)
    'barre_E_major': { strings: [0, 2, 2, 1, 0, 0], rootString: 6, baseFret: 0 },
    'barre_E_minor': { strings: [0, 2, 2, 0, 0, 0], rootString: 6, baseFret: 0 },
    'barre_A_major': { strings: [-1, 0, 2, 2, 2, 0], rootString: 5, baseFret: 0 },
    'barre_A_minor': { strings: [-1, 0, 2, 2, 1, 0], rootString: 5, baseFret: 0 },
};

/**
 * Parse a chord name into its components
 * @param {string} chordName - e.g., 'Em7', 'F#maj7', 'Bbdim', 'Gsus4'
 * @returns {Object} {root: string, quality: string, bass: string|null}
 */
function parseChordName(chordName) {
    if (!chordName || typeof chordName !== 'string') {
        return null;
    }
    
    // Normalize input
    chordName = chordName.trim();
    
    // Regex to parse chord: root note + optional accidental + quality + optional bass note
    const chordRegex = /^([A-Ga-g])([#b]?)(.*)$/;
    const match = chordName.match(chordRegex);
    
    if (!match) {
        return null;
    }
    
    let [, rootLetter, accidental, qualityPart] = match;
    rootLetter = rootLetter.toUpperCase();
    
    // Handle bass note (slash chord like C/G)
    let bass = null;
    if (qualityPart.includes('/')) {
        const parts = qualityPart.split('/');
        qualityPart = parts[0];
        bass = parts[1];
    }
    
    // Determine chord quality
    let quality = 'major'; // default
    const qualityLower = qualityPart.toLowerCase();
    
    // Match quality patterns (order matters - longer patterns first, and case-sensitive patterns before case-insensitive)
    const qualityPatterns = [
        { pattern: /^m7b5|^min7b5|^ø/i, quality: 'm7b5' },
        { pattern: /^mmaj7|^minmaj7/i, quality: 'mMaj7' },
        { pattern: /^m7|^min7|-7/, quality: 'm7' },         // m7 MUST come before maj7 (no i flag - case sensitive)
        { pattern: /^m9|^min9/, quality: 'm9' },            // m9 before maj9 (case sensitive)
        { pattern: /^m6|^min6/, quality: 'm6' },            // case sensitive for minor
        { pattern: /^m|^min|-/, quality: 'minor' },         // minor before major patterns (case sensitive)
        { pattern: /^maj7|^M7|^Δ7/, quality: 'maj7' },      // Now case-sensitive to avoid matching m7
        { pattern: /^maj9|^M9/, quality: 'maj9' },          // case-sensitive
        { pattern: /^dim7|^°7/i, quality: 'dim7' },
        { pattern: /^aug7|^\+7/i, quality: 'aug7' },
        { pattern: /^7sus4/i, quality: '7sus4' },
        { pattern: /^add9/i, quality: 'add9' },
        { pattern: /^sus2/i, quality: 'sus2' },
        { pattern: /^sus4|^sus/i, quality: 'sus4' },
        { pattern: /^dim|^°/i, quality: 'dim' },
        { pattern: /^aug|^\+/i, quality: 'aug' },
        { pattern: /^9/i, quality: '9' },
        { pattern: /^7/i, quality: '7' },
        { pattern: /^6/i, quality: '6' },
    ];
    
    for (const { pattern, quality: q } of qualityPatterns) {
        if (pattern.test(qualityPart)) {
            quality = q;
            break;
        }
    }
    
    return {
        root: rootLetter + accidental,
        quality: quality,
        bass: bass
    };
}

/**
 * Get the semitone index of a note (C=0, C#=1, ..., B=11)
 * @param {string} noteName - e.g., 'C', 'F#', 'Bb'
 * @returns {number} Semitone index (0-11)
 */
function getNoteIndex(noteName) {
    const noteMap = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return noteMap[noteName] ?? -1;
}

/**
 * Get chord notes from root and quality
 * @param {string} root - Root note (e.g., 'E', 'F#')
 * @param {string} quality - Chord quality (e.g., 'minor', 'm7')
 * @returns {Array<string>} Array of note names
 */
function getChordNotes(root, quality) {
    const intervals = CHORD_INTERVALS[quality];
    if (!intervals) {
        console.warn(`Unknown chord quality: ${quality}`);
        return [];
    }
    
    const rootIndex = getNoteIndex(root);
    if (rootIndex === -1) {
        console.warn(`Unknown root note: ${root}`);
        return [];
    }
    
    return intervals.map(interval => {
        const noteIndex = (rootIndex + interval) % 12;
        return NOTE_NAMES[noteIndex];
    });
}

/**
 * Calculate fret positions for a chord
 * @param {string} chordName - e.g., 'Em7', 'Cmaj7'
 * @returns {Array} Array of {string, fret, isRoot} objects
 */
function calculateChordPositions(chordName) {
    const parsed = parseChordName(chordName);
    if (!parsed) {
        console.warn(`Could not parse chord: ${chordName}`);
        return [];
    }
    
    const { root, quality } = parsed;
    const rootIndex = getNoteIndex(root);
    
    // Try to find a specific voicing first
    let shape = findChordShape(root, quality);
    
    if (shape) {
        return shapeToPositions(shape, root);
    }
    
    // If no specific shape, generate a basic voicing
    return generateBasicVoicing(root, quality);
}

/**
 * Find the best chord shape for a given root and quality
 * @param {string} root - Root note
 * @param {string} quality - Chord quality
 * @returns {Object|null} Chord shape or null
 */
function findChordShape(root, quality) {
    const rootIndex = getNoteIndex(root);
    
    // Map quality to shape key
    const qualityToShape = {
        'major': 'major',
        'minor': 'minor',
        '7': '7',
        'm7': 'm7',
        'maj7': 'maj7',
    };
    
    const shapeQuality = qualityToShape[quality] || quality;
    
    // Check for open chord shapes (E, A, D, G, C roots)
    const openChords = ['E', 'A', 'D', 'G', 'C'];
    if (openChords.includes(root)) {
        const shapeKey = `${root}_${shapeQuality}`;
        if (CHORD_SHAPES[shapeKey]) {
            return { ...CHORD_SHAPES[shapeKey], transpose: 0 };
        }
    }
    
    // Use barre chord shapes for other roots
    // Find the closest E or A shape and transpose
    const eRootIndex = getNoteIndex('E'); // 4
    const aRootIndex = getNoteIndex('A'); // 9
    
    const transposedFromE = (rootIndex - eRootIndex + 12) % 12;
    const transposedFromA = (rootIndex - aRootIndex + 12) % 12;
    
    // Try E-shape barre first if it requires fewer frets
    let baseShape;
    let transpose;
    
    if (transposedFromE <= 7) {
        baseShape = CHORD_SHAPES[`E_${shapeQuality}`] || CHORD_SHAPES['E_major'];
        transpose = transposedFromE;
    } else {
        baseShape = CHORD_SHAPES[`A_${shapeQuality}`] || CHORD_SHAPES['A_major'];
        transpose = transposedFromA;
    }
    
    if (baseShape) {
        return { ...baseShape, transpose };
    }
    
    return null;
}

/**
 * Convert a chord shape to fret positions
 * @param {Object} shape - Chord shape object
 * @param {string} root - Root note name
 * @returns {Array} Array of {string, fret, isRoot} objects
 */
function shapeToPositions(shape, root) {
    const positions = [];
    const transpose = shape.transpose || 0;
    
    shape.strings.forEach((fret, index) => {
        const stringNum = 6 - index; // Convert array index to string number (6 to 1)
        
        if (fret >= 0) {
            const actualFret = fret + transpose;
            const noteAtPosition = getNoteAtPosition(stringNum, actualFret);
            const isRoot = noteAtPosition === root || 
                          (root.length > 1 && getNoteIndex(noteAtPosition) === getNoteIndex(root));
            
            positions.push({
                string: stringNum,
                fret: actualFret,
                isRoot: isRoot
            });
        }
    });
    
    return positions;
}

/**
 * Generate a basic chord voicing when no predefined shape exists
 * @param {string} root - Root note
 * @param {string} quality - Chord quality
 * @returns {Array} Array of {string, fret, isRoot} objects
 */
function generateBasicVoicing(root, quality) {
    const chordNotes = getChordNotes(root, quality);
    if (chordNotes.length === 0) return [];
    
    const positions = [];
    const usedStrings = new Set();
    
    // For each string, find the nearest chord tone in first 5 frets
    for (let stringNum = 6; stringNum >= 1 && positions.length < 6; stringNum--) {
        for (let fret = 0; fret <= 5; fret++) {
            const noteAtPos = getNoteAtPosition(stringNum, fret);
            const noteIndex = NOTE_NAMES.indexOf(noteAtPos);
            
            // Check if this note is in the chord
            if (chordNotes.some(n => getNoteIndex(n) === noteIndex)) {
                if (!usedStrings.has(stringNum)) {
                    positions.push({
                        string: stringNum,
                        fret: fret,
                        isRoot: noteIndex === getNoteIndex(root)
                    });
                    usedStrings.add(stringNum);
                    break;
                }
            }
        }
    }
    
    return positions;
}

// ================================
// CHORD DISPLAY FUNCTION
// ================================

/**
 * Display a chord on the fretboard
 * @param {string} chordName - Chord name (e.g., 'Em7', 'Cmaj7')
 */
function displayChord(chordName) {
    const positions = calculateChordPositions(chordName);
    
    if (positions.length === 0) {
        console.warn(`No positions found for chord: ${chordName}`);
        return;
    }
    
    state.currentChord = chordName;
    highlightChord(positions);
    
    console.log(`Displayed chord: ${chordName}`, positions);
}

// ================================
// SONG SEARCH - MOCK DATABASE
// ================================

const SONG_DATABASE = {
    'wonderwall': {
        title: 'Wonderwall',
        artist: 'Oasis',
        chords: ['Em7', 'G', 'Dsus4', 'A7sus4'],
        key: 'E minor'
    },
    'hotel california': {
        title: 'Hotel California',
        artist: 'Eagles',
        chords: ['Am', 'E7', 'G', 'D', 'F', 'C', 'Dm', 'E'],
        key: 'B minor'
    },
    'wish you were here': {
        title: 'Wish You Were Here',
        artist: 'Pink Floyd',
        chords: ['Em7', 'G', 'A7sus4', 'C', 'D', 'Am'],
        key: 'G major'
    },
    'stairway to heaven': {
        title: 'Stairway to Heaven',
        artist: 'Led Zeppelin',
        chords: ['Am', 'E+', 'C', 'D', 'Fmaj7', 'G', 'Am7'],
        key: 'A minor'
    },
    'hallelujah': {
        title: 'Hallelujah',
        artist: 'Leonard Cohen',
        chords: ['C', 'Am', 'F', 'G', 'E7'],
        key: 'C major'
    },
    'blackbird': {
        title: 'Blackbird',
        artist: 'The Beatles',
        chords: ['G', 'Am7', 'G/B', 'C', 'A7', 'D7'],
        key: 'G major'
    },
    'nothing else matters': {
        title: 'Nothing Else Matters',
        artist: 'Metallica',
        chords: ['Em', 'Am', 'C', 'D', 'G', 'B7'],
        key: 'E minor'
    },
    'house of the rising sun': {
        title: 'House of the Rising Sun',
        artist: 'The Animals',
        chords: ['Am', 'C', 'D', 'F', 'E'],
        key: 'A minor'
    },
    'sweet home alabama': {
        title: 'Sweet Home Alabama',
        artist: 'Lynyrd Skynyrd',
        chords: ['D', 'C', 'G'],
        key: 'D major'
    },
    'knockin on heavens door': {
        title: "Knockin' on Heaven's Door",
        artist: 'Bob Dylan',
        chords: ['G', 'D', 'Am', 'C'],
        key: 'G major'
    }
};

/**
 * Search for songs matching a query
 * @param {string} query - Search query
 * @returns {Array} Array of matching song objects
 */
function searchSongs(query) {
    if (!query || query.trim().length === 0) {
        return [];
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    const results = [];
    
    for (const [key, song] of Object.entries(SONG_DATABASE)) {
        // Match by title or artist
        if (key.includes(normalizedQuery) || 
            song.title.toLowerCase().includes(normalizedQuery) ||
            song.artist.toLowerCase().includes(normalizedQuery)) {
            results.push(song);
        }
    }
    
    return results;
}

/**
 * Search for chords matching a query
 * @param {string} query - Search query (chord name)
 * @returns {Object|null} Parsed chord info or null
 */
function searchChords(query) {
    const parsed = parseChordName(query);
    if (parsed) {
        const chordNotes = getChordNotes(parsed.root, parsed.quality);
        return {
            name: query,
            ...parsed,
            notes: chordNotes
        };
    }
    return null;
}

/**
 * Handle search input - determines if query is a chord or song
 * @param {string} query - Search query
 * @returns {Object} {type: 'chord'|'songs', result: ...}
 */
function handleSearch(query) {
    if (!query || query.trim().length === 0) {
        return { type: 'empty', result: null };
    }
    
    // First, try to parse as a chord
    const chordResult = searchChords(query);
    if (chordResult && chordResult.notes.length > 0) {
        return { type: 'chord', result: chordResult };
    }
    
    // Otherwise, search for songs
    const songResults = searchSongs(query);
    if (songResults.length > 0) {
        return { type: 'songs', result: songResults };
    }
    
    return { type: 'notfound', result: null };
}

// ================================
// SEARCH UI INTEGRATION
// ================================

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (!searchInput || !searchBtn) {
        console.warn('Search elements not found');
        return;
    }
    
    // Handle search button click
    searchBtn.addEventListener('click', () => {
        performSearch(searchInput.value);
    });
    
    // Handle Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });
    
    // Real-time search suggestions (debounced)
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            showSearchSuggestions(searchInput.value);
        }, 300);
    });
}

/**
 * Perform search and display results
 * @param {string} query - Search query
 */
function performSearch(query) {
    const result = handleSearch(query);
    
    switch (result.type) {
        case 'chord':
            displayChord(result.result.name);
            console.log(`Chord found: ${result.result.name}`, result.result);
            hideSearchResults();
            break;
            
        case 'songs':
            showSongResults(result.result);
            break;
            
        case 'notfound':
            console.log(`No results found for: ${query}`);
            showNoResults(query);
            break;
            
        case 'empty':
            hideSearchResults();
            break;
    }
}

/**
 * Show search suggestions dropdown
 * @param {string} query - Current input value
 */
function showSearchSuggestions(query) {
    if (!query || query.length < 2) {
        hideSearchResults();
        return;
    }
    
    const result = handleSearch(query);
    
    // Create or get results container
    let resultsContainer = document.querySelector('.search-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results glass-panel';
        document.querySelector('.search-panel')?.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = '';
    
    if (result.type === 'chord') {
        const item = document.createElement('div');
        item.className = 'search-result-item chord-result';
        item.innerHTML = `
            <span class="result-icon">🎸</span>
            <span class="result-text"><strong>${result.result.name}</strong> - ${result.result.notes.join(', ')}</span>
        `;
        item.addEventListener('click', () => {
            displayChord(result.result.name);
            hideSearchResults();
            document.querySelector('.search-input').value = result.result.name;
        });
        resultsContainer.appendChild(item);
    }
    
    if (result.type === 'songs') {
        result.result.slice(0, 5).forEach(song => {
            const item = document.createElement('div');
            item.className = 'search-result-item song-result';
            item.innerHTML = `
                <span class="result-icon">🎵</span>
                <span class="result-text"><strong>${song.title}</strong> - ${song.artist}</span>
                <span class="result-chords">${song.chords.join(', ')}</span>
            `;
            item.addEventListener('click', () => {
                showSongDetails(song);
                hideSearchResults();
            });
            resultsContainer.appendChild(item);
        });
    }
    
    if (result.type === 'notfound') {
        resultsContainer.innerHTML = '<div class="search-result-item no-result">No results found</div>';
    }
    
    resultsContainer.style.display = 'block';
}

/**
 * Show song results with chords
 * @param {Array} songs - Array of song objects
 */
function showSongResults(songs) {
    let resultsContainer = document.querySelector('.search-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results glass-panel';
        document.querySelector('.search-panel')?.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = '<div class="results-header">Song Results</div>';
    
    songs.forEach(song => {
        const item = document.createElement('div');
        item.className = 'search-result-item song-result';
        item.innerHTML = `
            <div class="song-info">
                <strong>${song.title}</strong> - ${song.artist}
                <div class="song-key">Key: ${song.key}</div>
            </div>
            <div class="song-chords">${song.chords.map(c => `<span class="chord-tag">${c}</span>`).join('')}</div>
        `;
        
        // Add click handlers for chord tags
        item.querySelectorAll('.chord-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                displayChord(tag.textContent);
            });
        });
        
        resultsContainer.appendChild(item);
    });
    
    resultsContainer.style.display = 'block';
}

/**
 * Show detailed song view
 * @param {Object} song - Song object
 */
function showSongDetails(song) {
    console.log(`Selected song: ${song.title} by ${song.artist}`);
    console.log(`Chords: ${song.chords.join(' - ')}`);
    
    // Display the first chord
    if (song.chords.length > 0) {
        displayChord(song.chords[0]);
    }
    
    // Update search input
    document.querySelector('.search-input').value = song.title;
    
    showSongResults([song]);
}

/**
 * Show no results message
 * @param {string} query - The search query
 */
function showNoResults(query) {
    let resultsContainer = document.querySelector('.search-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results glass-panel';
        document.querySelector('.search-panel')?.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = `<div class="search-result-item no-result">No results found for "${query}"</div>`;
    resultsContainer.style.display = 'block';
}

/**
 * Hide search results dropdown
 */
function hideSearchResults() {
    const resultsContainer = document.querySelector('.search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}


// ================================
// MULTIPLE VOICING GENERATOR (CAGED System)
// ================================

/**
 * CAGED chord shape templates for generating voicings across the fretboard
 * Each shape can be transposed to any root note
 */
const CAGED_SHAPES = {
    // E-shape (root on 6th string)
    E: {
        major: { strings: [0, 2, 2, 1, 0, 0], rootString: 6, rootFret: 0, name: 'E-shape' },
        minor: { strings: [0, 2, 2, 0, 0, 0], rootString: 6, rootFret: 0, name: 'E-shape' },
        '7': { strings: [0, 2, 0, 1, 0, 0], rootString: 6, rootFret: 0, name: 'E-shape' },
        'm7': { strings: [0, 2, 0, 0, 0, 0], rootString: 6, rootFret: 0, name: 'E-shape' },
        'maj7': { strings: [0, 2, 1, 1, 0, 0], rootString: 6, rootFret: 0, name: 'E-shape' },
    },
    // A-shape (root on 5th string)
    A: {
        major: { strings: [-1, 0, 2, 2, 2, 0], rootString: 5, rootFret: 0, name: 'A-shape' },
        minor: { strings: [-1, 0, 2, 2, 1, 0], rootString: 5, rootFret: 0, name: 'A-shape' },
        '7': { strings: [-1, 0, 2, 0, 2, 0], rootString: 5, rootFret: 0, name: 'A-shape' },
        'm7': { strings: [-1, 0, 2, 0, 1, 0], rootString: 5, rootFret: 0, name: 'A-shape' },
        'maj7': { strings: [-1, 0, 2, 1, 2, 0], rootString: 5, rootFret: 0, name: 'A-shape' },
    },
    // D-shape (root on 4th string)
    D: {
        major: { strings: [-1, -1, 0, 2, 3, 2], rootString: 4, rootFret: 0, name: 'D-shape' },
        minor: { strings: [-1, -1, 0, 2, 3, 1], rootString: 4, rootFret: 0, name: 'D-shape' },
        '7': { strings: [-1, -1, 0, 2, 1, 2], rootString: 4, rootFret: 0, name: 'D-shape' },
        'm7': { strings: [-1, -1, 0, 2, 1, 1], rootString: 4, rootFret: 0, name: 'D-shape' },
        'maj7': { strings: [-1, -1, 0, 2, 2, 2], rootString: 4, rootFret: 0, name: 'D-shape' },
    },
    // C-shape (root on 5th string, higher position)
    C: {
        major: { strings: [-1, 3, 2, 0, 1, 0], rootString: 5, rootFret: 3, name: 'C-shape' },
        minor: { strings: [-1, 3, 1, 0, 1, -1], rootString: 5, rootFret: 3, name: 'C-shape' },
        '7': { strings: [-1, 3, 2, 3, 1, 0], rootString: 5, rootFret: 3, name: 'C-shape' },
        'm7': { strings: [-1, 3, 1, 3, 1, -1], rootString: 5, rootFret: 3, name: 'C-shape' },
        'maj7': { strings: [-1, 3, 2, 0, 0, 0], rootString: 5, rootFret: 3, name: 'C-shape' },
    },
    // G-shape (root on 6th string, higher position) 
    G: {
        major: { strings: [3, 2, 0, 0, 0, 3], rootString: 6, rootFret: 3, name: 'G-shape' },
        minor: { strings: [3, 1, 0, 0, 3, 3], rootString: 6, rootFret: 3, name: 'G-shape' },
        '7': { strings: [3, 2, 0, 0, 0, 1], rootString: 6, rootFret: 3, name: 'G-shape' },
        'm7': { strings: [3, 1, 0, 0, 3, 1], rootString: 6, rootFret: 3, name: 'G-shape' },
        'maj7': { strings: [3, 2, 0, 0, 0, 2], rootString: 6, rootFret: 3, name: 'G-shape' },
    },
};

/**
 * Generate ALL possible voicings for a chord across the fretboard
 * @param {string} chordName - Chord name (e.g., 'Fmaj7', 'Bb', 'Am')
 * @param {number} maxFret - Maximum fret to consider (default: 15)
 * @returns {Array} Array of voicing objects with positions and metadata
 */
function generateAllVoicings(chordName, maxFret = 15) {
    const parsed = parseChordName(chordName);
    if (!parsed) return [];
    
    const { root, quality } = parsed;
    const rootIndex = getNoteIndex(root);
    const voicings = [];
    
    console.log(`generateAllVoicings: ${chordName} -> root=${root}, quality=${quality}`);
    
    // Map chord quality to CAGED shape quality
    const qualityMap = {
        'major': 'major',
        'minor': 'minor',
        '7': '7',
        'm7': 'm7',
        'maj7': 'maj7',
        'dim': 'minor',  // Approximate with minor for now
        'aug': 'major',  // Approximate
        'sus4': 'major', // Approximate
        'sus2': 'major', // Approximate
    };
    
    const shapeQuality = qualityMap[quality] || 'major';
    console.log(`  shapeQuality mapped to: ${shapeQuality}`);
    
    // Generate voicings from each CAGED shape
    for (const [shapeName, shapes] of Object.entries(CAGED_SHAPES)) {
        const shape = shapes[shapeQuality];
        if (!shape) continue;
        
        // Calculate the base note for this shape
        const baseRootString = shape.rootString;
        const baseRootFret = shape.rootFret;
        
        // Get the note at the root position of the base shape
        let baseNoteIndex;
        if (shapeName === 'E') baseNoteIndex = getNoteIndex('E');
        else if (shapeName === 'A') baseNoteIndex = getNoteIndex('A');
        else if (shapeName === 'D') baseNoteIndex = getNoteIndex('D');
        else if (shapeName === 'C') baseNoteIndex = getNoteIndex('C');
        else if (shapeName === 'G') baseNoteIndex = getNoteIndex('G');
        
        // Calculate transpose amount to reach target root
        const transpose = (rootIndex - baseNoteIndex + 12) % 12;
        
        // Generate voicing at this position
        const positions = [];
        let minFret = Infinity;
        let maxFretUsed = 0;
        let validVoicing = true;
        
        shape.strings.forEach((fret, index) => {
            const stringNum = 6 - index;
            if (fret >= 0) {
                const actualFret = fret + transpose;
                
                // Skip if fret is beyond our limit
                if (actualFret > maxFret) {
                    validVoicing = false;
                    return;
                }
                
                const noteAtPosition = getNoteAtPosition(stringNum, actualFret);
                const isRoot = getNoteIndex(noteAtPosition) === rootIndex;
                
                positions.push({
                    string: stringNum,
                    fret: actualFret,
                    isRoot: isRoot
                });
                
                if (actualFret > 0) {
                    minFret = Math.min(minFret, actualFret);
                    maxFretUsed = Math.max(maxFretUsed, actualFret);
                }
            }
        });
        
        if (validVoicing && positions.length >= 3) {
            const avgFret = positions.reduce((sum, p) => sum + p.fret, 0) / positions.length;
            
            voicings.push({
                chordName,
                shapeName: shape.name,
                positions,
                baseFret: minFret === Infinity ? 0 : minFret,
                avgFret: avgFret,
                fretSpan: maxFretUsed - (minFret === Infinity ? 0 : minFret),
            });
        }
    }
    
    // Sort by average fret position
    voicings.sort((a, b) => a.avgFret - b.avgFret);
    
    return voicings;
}

/**
 * Calculate the "movement cost" between two voicings
 * Lower cost = easier transition
 * @param {Object} voicing1 - First voicing
 * @param {Object} voicing2 - Second voicing
 * @returns {number} Movement cost
 */
function calculateMovementCost(voicing1, voicing2) {
    // Primary cost: difference in average fret position
    const fretDiff = Math.abs(voicing1.avgFret - voicing2.avgFret);
    
    // Secondary cost: difference in fret span (prefer consistent hand positions)
    const spanDiff = Math.abs(voicing1.fretSpan - voicing2.fretSpan);
    
    // Bonus: same shape type is easier
    const shapeBonus = voicing1.shapeName === voicing2.shapeName ? -1 : 0;
    
    return fretDiff * 2 + spanDiff * 0.5 + shapeBonus;
}

/**
 * Find optimal voicings for a chord progression to minimize hand movement
 * @param {Array<string>} chordNames - Array of chord names
 * @param {Object} options - Optimization options
 * @param {number} options.preferredFret - Preferred fret position (default: 5)
 * @param {number} options.fretRange - How far from preferred to search (default: 7)
 * @returns {Array} Array of optimized voicings
 */
function optimizeProgression(chordNames, options = {}) {
    const { preferredFret = 5, fretRange = 7 } = options;
    
    if (chordNames.length === 0) return [];
    
    // Generate all voicings for each chord
    const allVoicings = chordNames.map(chord => {
        const voicings = generateAllVoicings(chord);
        // Filter to preferred fret range
        return voicings.filter(v => 
            v.avgFret >= preferredFret - fretRange && 
            v.avgFret <= preferredFret + fretRange
        );
    });
    
    // If any chord has no voicings in range, expand search
    for (let i = 0; i < allVoicings.length; i++) {
        if (allVoicings[i].length === 0) {
            allVoicings[i] = generateAllVoicings(chordNames[i]);
        }
    }
    
    // Use dynamic programming to find optimal path
    const n = chordNames.length;
    
    if (n === 1) {
        // Single chord - pick the one closest to preferred fret
        const closest = allVoicings[0].reduce((best, v) => 
            Math.abs(v.avgFret - preferredFret) < Math.abs(best.avgFret - preferredFret) ? v : best
        );
        return [closest];
    }
    
    // For each voicing of each chord, track the minimum cost to reach it
    const dp = allVoicings.map(voicings => 
        voicings.map(() => ({ cost: Infinity, prev: -1 }))
    );
    
    // Initialize first chord - cost based on distance from preferred fret
    allVoicings[0].forEach((v, i) => {
        dp[0][i].cost = Math.abs(v.avgFret - preferredFret);
    });
    
    // Fill DP table
    for (let i = 1; i < n; i++) {
        for (let j = 0; j < allVoicings[i].length; j++) {
            for (let k = 0; k < allVoicings[i - 1].length; k++) {
                const moveCost = calculateMovementCost(allVoicings[i - 1][k], allVoicings[i][j]);
                const totalCost = dp[i - 1][k].cost + moveCost;
                
                if (totalCost < dp[i][j].cost) {
                    dp[i][j].cost = totalCost;
                    dp[i][j].prev = k;
                }
            }
        }
    }
    
    // Backtrack to find optimal path
    const result = [];
    let minCost = Infinity;
    let lastIndex = 0;
    
    // Find best ending voicing
    dp[n - 1].forEach((v, i) => {
        if (v.cost < minCost) {
            minCost = v.cost;
            lastIndex = i;
        }
    });
    
    // Backtrack
    for (let i = n - 1; i >= 0; i--) {
        result.unshift(allVoicings[i][lastIndex]);
        lastIndex = dp[i][lastIndex].prev;
    }
    
    return result;
}

// ================================
// PROGRESSION PARSING & MANAGEMENT
// ================================

/**
 * Check if input is a chord progression (multiple chords)
 * @param {string} input - User input
 * @returns {boolean} True if progression detected
 */
function isProgression(input) {
    if (!input) return false;
    // Detect comma, dash, or multiple spaces as separators
    return /[,\-]/.test(input) || input.trim().split(/\s+/).length > 1;
}

/**
 * Parse a progression string into chord names
 * @param {string} input - e.g., "Fmaj7, Bb, Am, Dm7" or "Fmaj7 - Bb - Am - Dm7"
 * @returns {Array<string>} Array of chord names
 */
function parseProgression(input) {
    if (!input) return [];
    
    // Split by comma, dash, or multiple spaces
    const parts = input.split(/[,\-]+|\s{2,}/).map(s => s.trim()).filter(Boolean);
    
    // If no separators found, try splitting by single spaces (but validate each as chord)
    if (parts.length === 1) {
        const spaceParts = input.trim().split(/\s+/);
        if (spaceParts.length > 1 && spaceParts.every(p => parseChordName(p))) {
            return spaceParts;
        }
    }
    
    // Validate each part is a valid chord
    return parts.filter(p => parseChordName(p));
}

/**
 * Load a chord progression and optimize voicings
 * @param {Array<string>} chords - Array of chord names
 * @param {Object} options - Optimization options
 */
function loadProgression(chords, options = {}) {
    if (!chords || chords.length === 0) return;
    
    // Optimize the progression
    const optimizedVoicings = optimizeProgression(chords, options);
    
    // Update state
    state.progression.chords = chords;
    state.progression.voicings = optimizedVoicings;
    state.progression.currentIndex = 0;
    state.progression.isPlaying = false;
    
    // Display progression UI
    renderProgressionBar();
    
    // Show first chord
    if (optimizedVoicings.length > 0) {
        displayVoicing(optimizedVoicings[0]);
    }
    
    console.log('Progression loaded:', chords);
    console.log('Optimized voicings:', optimizedVoicings.map(v => 
        `${v.chordName} @ fret ${v.baseFret} (${v.shapeName})`
    ));
}

/**
 * Display a specific voicing on the fretboard
 * @param {Object} voicing - Voicing object with positions
 */
function displayVoicing(voicing) {
    if (!voicing || !voicing.positions) return;
    
    state.currentChord = voicing.chordName;
    highlightChord(voicing.positions);
}

/**
 * Navigate to a specific chord in the progression
 * @param {number} index - Chord index
 */
function goToChord(index) {
    const { voicings } = state.progression;
    if (index < 0 || index >= voicings.length) return;
    
    state.progression.currentIndex = index;
    displayVoicing(voicings[index]);
    updateProgressionUI();
}

/**
 * Go to next chord in progression
 */
function nextChord() {
    const { currentIndex, voicings, loopEnabled } = state.progression;
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= voicings.length) {
        nextIndex = loopEnabled ? 0 : voicings.length - 1;
    }
    
    goToChord(nextIndex);
}

/**
 * Go to previous chord in progression
 */
function prevChord() {
    const { currentIndex, voicings, loopEnabled } = state.progression;
    let prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
        prevIndex = loopEnabled ? voicings.length - 1 : 0;
    }
    
    goToChord(prevIndex);
}

// ================================
// PROGRESSION UI
// ================================

let playIntervalId = null;

/**
 * Render the progression bar UI
 */
function renderProgressionBar() {
    // Remove existing progression bar
    const existing = document.querySelector('.progression-container');
    if (existing) existing.remove();
    
    const { chords, voicings, currentIndex } = state.progression;
    if (chords.length === 0) return;
    
    // Create container
    const container = document.createElement('div');
    container.className = 'progression-container glass-panel';
    
    // Create chord chips
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'progression-chips';
    
    chords.forEach((chord, index) => {
        const chip = document.createElement('button');
        chip.className = `progression-chip ${index === currentIndex ? 'active' : ''}`;
        chip.innerHTML = `
            <span class="chip-number">${index + 1}</span>
            <span class="chip-chord">${chord}</span>
            ${voicings[index] ? `<span class="chip-fret">Fret ${voicings[index].baseFret}</span>` : ''}
        `;
        chip.addEventListener('click', () => goToChord(index));
        chipsContainer.appendChild(chip);
        
        // Add arrow between chips
        if (index < chords.length - 1) {
            const arrow = document.createElement('span');
            arrow.className = 'chip-arrow';
            arrow.textContent = '→';
            chipsContainer.appendChild(arrow);
        }
    });
    
    container.appendChild(chipsContainer);
    
    // Create controls
    const controls = document.createElement('div');
    controls.className = 'progression-controls';
    controls.innerHTML = `
        <button class="prog-btn" id="prev-chord" title="Previous (←)">◄ Prev</button>
        <button class="prog-btn play-btn" id="play-pause" title="Play/Pause (Space)">▶ Play</button>
        <button class="prog-btn" id="next-chord" title="Next (→)">Next ►</button>
        <button class="prog-btn ${state.progression.loopEnabled ? 'active' : ''}" id="loop-toggle" title="Loop">🔄 Loop</button>
        <div class="tempo-control">
            <label>⚡</label>
            <input type="range" id="tempo-slider" min="40" max="200" value="${state.progression.tempo}">
            <span id="tempo-value">${state.progression.tempo} BPM</span>
        </div>
    `;
    
    container.appendChild(controls);
    
    // Insert after search panel
    const searchPanel = document.querySelector('.search-panel');
    if (searchPanel) {
        searchPanel.after(container);
    } else {
        document.querySelector('.main-content')?.prepend(container);
    }
    
    // Bind control events
    document.getElementById('prev-chord')?.addEventListener('click', prevChord);
    document.getElementById('next-chord')?.addEventListener('click', nextChord);
    document.getElementById('play-pause')?.addEventListener('click', togglePlay);
    document.getElementById('loop-toggle')?.addEventListener('click', toggleLoop);
    
    const tempoSlider = document.getElementById('tempo-slider');
    tempoSlider?.addEventListener('input', (e) => {
        state.progression.tempo = parseInt(e.target.value);
        document.getElementById('tempo-value').textContent = `${state.progression.tempo} BPM`;
        // Restart play if playing
        if (state.progression.isPlaying) {
            stopPlay();
            startPlay();
        }
    });
}

/**
 * Update progression UI to reflect current state
 */
function updateProgressionUI() {
    const { currentIndex, isPlaying } = state.progression;
    
    // Update chip active states
    document.querySelectorAll('.progression-chip').forEach((chip, index) => {
        chip.classList.toggle('active', index === currentIndex);
    });
    
    // Update play button
    const playBtn = document.getElementById('play-pause');
    if (playBtn) {
        playBtn.innerHTML = isPlaying ? '⏸ Pause' : '▶ Play';
    }
}

/**
 * Toggle auto-play
 */
function togglePlay() {
    if (state.progression.isPlaying) {
        stopPlay();
    } else {
        startPlay();
    }
}

/**
 * Start auto-play
 */
function startPlay() {
    const { tempo, beatsPerChord } = state.progression;
    const interval = (60000 / tempo) * beatsPerChord; // ms per chord change
    
    state.progression.isPlaying = true;
    updateProgressionUI();
    
    playIntervalId = setInterval(() => {
        nextChord();
    }, interval);
}

/**
 * Stop auto-play
 */
function stopPlay() {
    state.progression.isPlaying = false;
    updateProgressionUI();
    
    if (playIntervalId) {
        clearInterval(playIntervalId);
        playIntervalId = null;
    }
}

/**
 * Toggle loop mode
 */
function toggleLoop() {
    state.progression.loopEnabled = !state.progression.loopEnabled;
    document.getElementById('loop-toggle')?.classList.toggle('active', state.progression.loopEnabled);
}

/**
 * Initialize keyboard shortcuts for progression navigation
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Only handle if progression is active
        if (state.progression.chords.length === 0) return;
        
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                prevChord();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextChord();
                break;
            case ' ':
                e.preventDefault();
                togglePlay();
                break;
            case '1': case '2': case '3': case '4': 
            case '5': case '6': case '7': case '8': case '9':
                const index = parseInt(e.key) - 1;
                if (index < state.progression.chords.length) {
                    e.preventDefault();
                    goToChord(index);
                }
                break;
        }
    });
}

// ================================
// UPDATE SEARCH TO SUPPORT PROGRESSIONS
// ================================

/**
 * Enhanced search handler that supports progressions
 * @param {string} query - Search query
 */
function performSearchEnhanced(query) {
    // Check if this is a progression
    if (isProgression(query)) {
        const chords = parseProgression(query);
        if (chords.length > 1) {
            loadProgression(chords);
            hideSearchResults();
            return;
        }
    }
    
    // Fall back to original search behavior
    performSearch(query);
}

// Override the search initialization
const originalInitSearch = initSearch;
initSearch = function() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    if (!searchInput || !searchBtn) {
        console.warn('Search elements not found');
        return;
    }
    
    // Handle search button click
    searchBtn.addEventListener('click', () => {
        performSearchEnhanced(searchInput.value);
    });
    
    // Handle Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearchEnhanced(searchInput.value);
        }
    });
    
    // Real-time search suggestions (debounced)
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const value = searchInput.value;
            if (isProgression(value)) {
                // Show progression preview
                showProgressionPreview(value);
            } else {
                showSearchSuggestions(value);
            }
        }, 300);
    });
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();
};

/**
 * Show progression preview in dropdown
 * @param {string} input - Progression input
 */
function showProgressionPreview(input) {
    const chords = parseProgression(input);
    if (chords.length === 0) {
        hideSearchResults();
        return;
    }
    
    let resultsContainer = document.querySelector('.search-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results glass-panel';
        document.querySelector('.search-panel')?.appendChild(resultsContainer);
    }
    
    resultsContainer.innerHTML = `
        <div class="results-header">Chord Progression Detected</div>
        <div class="search-result-item progression-preview">
            <span class="result-icon">🎼</span>
            <div class="progression-preview-content">
                <strong>${chords.length} chords:</strong>
                <div class="preview-chords">${chords.map((c, i) => 
                    `<span class="chord-tag">${i + 1}. ${c}</span>`
                ).join('')}</div>
                <small>Press Enter to optimize positions for minimal hand movement</small>
            </div>
        </div>
    `;
    
    resultsContainer.querySelector('.progression-preview')?.addEventListener('click', () => {
        loadProgression(chords);
        hideSearchResults();
        document.querySelector('.search-input').value = chords.join(', ');
    });
    
    resultsContainer.style.display = 'block';
}

// ================================
// EXPORTED API (for console testing)
// ================================
window.GuitarFretboard = {
    highlightPosition,
    clearPosition,
    clearAllHighlights,
    highlightChord,
    getNoteAtPosition,
    vibrateString,
    getState: () => state,
    CONFIG,
    // Chord functions
    parseChordName,
    calculateChordPositions,
    displayChord,
    getChordNotes,
    // Search functions
    searchSongs,
    searchChords,
    handleSearch,
};

import React, { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";
import * as Tone from "tone";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import styled from "styled-components";
import { Button } from "./components/ds";
import InteractiveBackground from "./components/InteractiveBackground";
import Knob from "./components/Knob";
import InfoButton from "./components/InfoButton";

const WIDTH = 1000;
const HEIGHT = 500;

const ALL_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Generate a scale based on root note and interval pattern
function generateScale(rootNote, octave, intervals) {
  const rootIndex = ALL_NOTES.indexOf(rootNote);
  if (rootIndex === -1) return [];
  
  return intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    const octaveShift = Math.floor((rootIndex + interval) / 12);
    return `${ALL_NOTES[noteIndex]}${octave + octaveShift}`;
  });
}

// Scale interval patterns (semitones from root)
const SCALE_PATTERNS = {
  "Minor": [0, 2, 3, 5, 7, 8, 10, 12],
  "Major": [0, 2, 4, 5, 7, 9, 11, 12],
  "Blues": [0, 3, 5, 6, 7, 10, 12],
  "Japanese": [0, 1, 5, 7, 8, 12],
  "Whole Tone": [0, 2, 4, 6, 8, 10, 12],
  "Diminished": [0, 2, 3, 5, 6, 8, 9, 11, 12]
};

// The chromatic scale is special - it includes all semitones
function generateChromaticScale(rootNote, octave) {
  const rootIndex = ALL_NOTES.indexOf(rootNote);
  if (rootIndex === -1) return [];
  
  const scale = [];
  for (let i = 0; i < 13; i++) {
    const noteIndex = (rootIndex + i) % 12;
    const octaveShift = Math.floor((rootIndex + i) / 12);
    scale.push(`${ALL_NOTES[noteIndex]}${octave + octaveShift}`);
  }
  return scale;
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function Ball(x, y, dx, dy, color) {
  this.x = x;
  this.y = y;
  this.dx = dx;
  this.dy = dy;
  this.color = color;
}

const StyledSelect = styled.select`
  display: block;
  width: 100%;
  font-size: 14px;
  border: 1px none #666; // Update border color to a darker shade
  padding: 6px;
  background-color: #222; // Update background color to a dark shade
  color: #fff; // Update text color to white
  border-radius: 3px;
  appearance: none;
  margin-top: 5px;

  &:focus {
    outline: none;
    border-color: #0077ff;
  }
`;

function App() {
  const canvasRef = useRef(null);
  const balls = useRef([]);
  const synth = useRef(null);
  const delay = useRef(null);
  const reverb = useRef(null);
  const gain = useRef(null);
  const lowpassFilter = useRef(null);
  const highpassFilter = useRef(null);
  const audioAnalyzer = useRef(null);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);

  const [attack, setAttack] = useState(0.01);
  const [decay, setDecay] = useState(0.2);
  const [sustain, setSustain] = useState(0.2);
  const [release, setRelease] = useState(1);
  const [selectedScaleType, setSelectedScaleType] = useState("Minor");
  const [selectedKey, setSelectedKey] = useState("A");
  const [selectedOctave, setSelectedOctave] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const [delayMix, setDelayMix] = useState(0.5);
  const [reverbMix, setReverbMix] = useState(0.5);
  
  // Fixed ball speed as a constant
  const BALL_SPEED = 1;

  const [gainValue, setGainValue] = useState(0.5);

  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [isEmptyCanvas, setIsEmptyCanvas] = useState(true);

  const [lowpassFrequency, setLowpassFrequency] = useState(20000);
  const [highpassFrequency, setHighpassFrequency] = useState(0);

  const [waveform, setWaveform] = useState("sine");

  // Generate the current scale based on selections
  const getCurrentScale = useCallback(() => {
    if (selectedScaleType === "Chromatic") {
      return generateChromaticScale(selectedKey, selectedOctave);
    } else {
      return generateScale(selectedKey, selectedOctave, SCALE_PATTERNS[selectedScaleType]);
    }
  }, [selectedScaleType, selectedKey, selectedOctave]);
  
  // Helper function for debounce
  const debounce = useCallback((func, wait, immediate) => {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      const later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }, []);
  
  // Recreate playRandomNote when scale settings change
  const playRandomNote = useCallback(
    debounce(() => {
      if (!synth.current) return;
      
      const currentScale = getCurrentScale();
      
      // Choose a different approach based on the scale type
      if (selectedScaleType === "Chromatic") {
        // For chromatic scale, play a short run of adjacent notes
        const startIdx = Math.floor(Math.random() * (currentScale.length - 3));
        const note = currentScale[startIdx];
        synth.current.triggerAttackRelease(note, "16n");
        
        // Schedule a few more notes in sequence
        setTimeout(() => {
          synth.current.triggerAttackRelease(currentScale[startIdx + 1], "16n");
        }, 100);
        setTimeout(() => {
          synth.current.triggerAttackRelease(currentScale[startIdx + 2], "16n");
        }, 200);
      } else if (selectedScaleType === "Japanese" || selectedScaleType === "Whole Tone") {
        // For exotic scales, play wider intervals to highlight their character
        const note1 = currentScale[Math.floor(Math.random() * currentScale.length)];
        const note2 = currentScale[Math.floor(Math.random() * currentScale.length)];
        synth.current.triggerAttackRelease(note1, "8n");
        setTimeout(() => {
          synth.current.triggerAttackRelease(note2, "8n");
        }, 150);
      } else {
        // For other scales, just play a single note but with slightly longer duration
        synth.current.triggerAttackRelease(randomElement(currentScale), "8n");
      }
    }, 50),
    [selectedScaleType, selectedKey, selectedOctave, getCurrentScale]
  );

  // Separate effect for loading timer
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Helpers for animation
  const animateBallTouch = useCallback((ball) => {
    if (!canvasRef.current) return;
    
    // Reduced to 1-2 pulses per ball touch
    const numPulses = Math.floor(Math.random() * 2) + 1;
    
    // Get canvas dimensions and position for exclusion
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    
    for (let i = 0; i < numPulses; i++) {
      const pulseElement = document.createElement("div");
      pulseElement.classList.add("pulse");
      
      // Small, controlled size range
      const randomSize = 15 + Math.random() * 20;
      
      // Define strategic zones for pulse placement
      // This ensures pulses are distributed across different screen areas
      let randomX, randomY;
      
      // Determine placement strategy based on index
      // This creates a more even distribution across the screen
      switch (i % 4) {
        case 0: // Top-left quadrant
          randomX = Math.random() * (window.innerWidth * 0.4);
          randomY = Math.random() * (window.innerHeight * 0.4);
          break;
        case 1: // Top-right quadrant
          randomX = window.innerWidth * 0.6 + Math.random() * (window.innerWidth * 0.4);
          randomY = Math.random() * (window.innerHeight * 0.4);
          break;
        case 2: // Bottom-left quadrant
          randomX = Math.random() * (window.innerWidth * 0.4);
          randomY = window.innerHeight * 0.6 + Math.random() * (window.innerHeight * 0.4);
          break;
        case 3: // Bottom-right quadrant
          randomX = window.innerWidth * 0.6 + Math.random() * (window.innerWidth * 0.4);
          randomY = window.innerHeight * 0.6 + Math.random() * (window.innerHeight * 0.4);
          break;
      }
      
      // Avoid placing directly over the canvas by checking and adjusting if needed
      const margin = 50; // Minimum distance from canvas edge
      
      // Check if pulse overlaps with canvas (+/- margin)
      const overlapWithCanvas = 
        randomX + randomSize/2 > canvasRect.left - margin && 
        randomX - randomSize/2 < canvasRect.right + margin &&
        randomY + randomSize/2 > canvasRect.top - margin && 
        randomY - randomSize/2 < canvasRect.bottom + margin;
      
      // If it overlaps, move it to a safe position
      if (overlapWithCanvas) {
        // Move to edges of screen with higher probability
        const edgePosition = Math.random() > 0.5;
        if (edgePosition) {
          // Position along edges
          const side = Math.floor(Math.random() * 4);
          switch(side) {
            case 0: // Top edge
              randomY = randomSize;
              randomX = Math.random() * window.innerWidth;
              break;
            case 1: // Right edge
              randomX = window.innerWidth - randomSize;
              randomY = Math.random() * window.innerHeight;
              break;
            case 2: // Bottom edge
              randomY = window.innerHeight - randomSize;
              randomX = Math.random() * window.innerWidth;
              break;
            case 3: // Left edge
              randomX = randomSize;
              randomY = Math.random() * window.innerHeight;
              break;
          }
        }
      }
      
      // Ensure positioning works correctly
      pulseElement.style.position = 'fixed';
      pulseElement.style.left = `${randomX}px`;
      pulseElement.style.top = `${randomY}px`;
      
      // Get color from ball with slightly higher opacity
      let pulseColor;
      const rgbMatch = ball.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch && rgbMatch.length >= 4) {
        // Slightly reduced opacity (0.78)
        pulseColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.78)`;
      } else {
        pulseColor = ball.color === 'undefined' ? 
          'rgba(0, 128, 128, 0.78)' : 
          ball.color.replace('rgb', 'rgba').replace(')', ', 0.78)');
      }
      
      // Set the pulse color and size
      pulseElement.style.backgroundColor = pulseColor;
      pulseElement.style.width = `${randomSize}px`;
      pulseElement.style.height = `${randomSize}px`;
      
      // Add to DOM
      document.body.appendChild(pulseElement);

      // Clean up
      setTimeout(() => {
        if (document.body.contains(pulseElement)) {
          document.body.removeChild(pulseElement);
        }
      }, 2000);
    }
  }, []);

  // Setup canvas when loading is complete
  useEffect(() => {
    // Only set up canvas when loading is complete
    if (!isLoading && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      // Keep track of animation frame to cancel it on cleanup
      let animationFrameId;

      const updateBall = (ball) => {
        // Use original dx/dy values to keep speed consistent
        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x < 10 || ball.x > WIDTH - 10) {
          ball.dx = -ball.dx;
          playRandomNote();
          animateBallTouch(ball);
        }

        if (ball.y < 10 || ball.y > HEIGHT - 10) {
          ball.dy = -ball.dy;
          playRandomNote();
          animateBallTouch(ball);
        }
      };

      const drawBall = (ball) => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
      };

      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const ball of balls.current) {
          updateBall(ball);
          drawBall(ball);
        }

        animationFrameId = requestAnimationFrame(render);
      };

      render();
      
      // Clean up animation frame on unmount or when effect reruns
      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  // Add animateBallTouch as a dependency
  }, [isLoading, playRandomNote, animateBallTouch]);

  // Initialize audio context and analyzer only once
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);
  
  // Set up audio once loading is complete
  useEffect(() => {
    if (isLoading) return;
    
    try {
      // Set up audio analyzer
      const audioContext = Tone.getContext().rawContext;
      audioAnalyzer.current = audioContext.createAnalyser();
      audioAnalyzer.current.fftSize = 256;
      
      synth.current = new Tone.Synth({
        oscillator: {
          type: waveform,
        },
      });

      delay.current = new Tone.FeedbackDelay(0.5);
      reverb.current = new Tone.Reverb(1.5);
      gain.current = new Tone.Gain().toDestination();
      lowpassFilter.current = new Tone.Filter(20000, "lowpass");
      highpassFilter.current = new Tone.Filter(0, "highpass");
      
      // Connect the audio nodes including the analyzer
      synth.current.chain(
        highpassFilter.current,
        lowpassFilter.current,
        delay.current,
        reverb.current,
        gain.current
      );
      
      // Connect the analyzer to the main output
      gain.current.connect(audioAnalyzer.current);
      
      // Setup for recording
      const dest = audioContext.createMediaStreamDestination();
      gain.current.connect(dest);
      mediaRecorder.current = new MediaRecorder(dest.stream);
      
      mediaRecorder.current.ondataavailable = (evt) => {
        recordedChunks.current.push(evt.data);
      };
      
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(recordedChunks.current, { 
          type: 'audio/webm; codecs=opus' 
        });
        recordedChunks.current = [];
        
        // Convert to WAV format
        const fileReader = new FileReader();
        fileReader.onloadend = () => {
          const arrayBuffer = fileReader.result;
          
          // Use the audioContext to decode the audio data
          audioContext.decodeAudioData(arrayBuffer).then(audioBuffer => {
            // Convert AudioBuffer to WAV format
            const wavBlob = audioBufferToWav(audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `tonelab-recording-${new Date().toISOString()}.wav`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
          });
        };
        
        fileReader.readAsArrayBuffer(blob);
      };
      
      // Function to convert AudioBuffer to WAV
      function audioBufferToWav(audioBuffer) {
        const numOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        
        // Write WAV header
        // "RIFF" chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');
        
        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (PCM)
        view.setUint16(22, numOfChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * numOfChannels * 2, true); // byte rate
        view.setUint16(32, numOfChannels * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample
        
        // "data" sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, length, true);
        
        // Write audio data
        const channelData = [];
        let offset = 44;
        
        for (let i = 0; i < numOfChannels; i++) {
          channelData.push(audioBuffer.getChannelData(i));
        }
        
        for (let i = 0; i < audioBuffer.length; i++) {
          for (let channel = 0; channel < numOfChannels; channel++) {
            // Convert float32 to int16
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, int16, true);
            offset += 2;
          }
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
      }
      
      // Helper to write strings to DataView
      function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }, [isLoading, waveform]);

  useEffect(() => {
    if (!isLoading && synth.current) {
      synth.current.set({
        envelope: {
          attack: attack,
          decay: decay,
          sustain: sustain,
          release: release,
        },
      });
    }
  }, [attack, decay, sustain, release, isLoading]);

  useEffect(() => {
    if (!isLoading && delay.current) {
      delay.current.wet.value = delayMix;
    }
  }, [delayMix, isLoading]);

  useEffect(() => {
    if (!isLoading && reverb.current) {
      reverb.current.wet.value = reverbMix;
    }
  }, [reverbMix, isLoading]);

  useEffect(() => {
    if (!isLoading && gain.current) {
      gain.current.gain.value = gainValue;
    }
  }, [gainValue, isLoading]);

  useEffect(() => {
    if (!isLoading && lowpassFilter.current) {
      lowpassFilter.current.frequency.value = lowpassFrequency;
    }
  }, [lowpassFrequency, isLoading]);

  useEffect(() => {
    if (!isLoading && highpassFilter.current) {
      highpassFilter.current.frequency.value = highpassFrequency;
    }
  }, [highpassFrequency, isLoading]);

  const handleClick = (event) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Set consistent velocity without using BALL_SPEED multiplier
    // as that could cause acceleration if the effect reruns
    const dx = (Math.random() - 0.5) * 5;
    const dy = (Math.random() - 0.5) * 5;

    // Modern, vibrant colors with better contrast
    const colorOptions = [
      // Vibrant reds
      `rgb(255, 75, 75)`,
      `rgb(255, 107, 107)`,
      // Vibrant oranges
      `rgb(255, 138, 36)`,
      `rgb(255, 165, 0)`,
      // Vibrant yellows
      `rgb(255, 215, 0)`,
      `rgb(250, 230, 50)`,
      // Electric greens
      `rgb(0, 233, 111)`,
      `rgb(57, 255, 98)`,
      // Ocean blues
      `rgb(0, 156, 255)`,
      `rgb(65, 105, 225)`,
      // Rich purples
      `rgb(138, 43, 226)`,
      `rgb(186, 85, 255)`,
      // Vibrant cyans
      `rgb(0, 210, 210)`,
      `rgb(64, 224, 208)`,
      // Electric pinks
      `rgb(255, 64, 129)`,
      `rgb(246, 104, 255)`
    ];
    
    const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    console.log("Created ball with color:", randomColor);

    balls.current.push(new Ball(x, y, dx, dy, randomColor));
    setIsEmptyCanvas(false);
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth <= 768) {
        setShowMobileWarning(true);
      } else {
        setShowMobileWarning(false);
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /**
   * Performs the necessary actions to wipe out
   * all the balls in the canvas.
   */
  const handleOnClear = () => {
    balls.current = [];
    setIsEmptyCanvas(true);
  };
  
  /**
   * Toggles audio recording state
   */
  const handleRecordToggle = () => {
    if (isRecording) {
      // Stop recording
      mediaRecorder.current.stop();
      setIsRecording(false);
    } else {
      // Start recording
      recordedChunks.current = [];
      mediaRecorder.current.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="App">
      <div className="particles-background">
        {Array.from({ length: 300 }).map((_, i) => {
          // Calculate random positions across the entire screen
          const left = `${Math.random() * 100}%`;
          const top = `${Math.random() * 100}%`;
          
          return (
            <div 
              key={i} 
              className="particle" 
              style={{
                left,
                top,
                opacity: 0.3,
                visibility: 'visible'
              }}
            />
          );
        })}
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-animation">
            <div className="loading-circle"></div>
            <div className="loading-circle"></div>
            <div className="loading-circle"></div>
          </div>
          <div className="loading-text">ToneLab 2.0</div>
        </div>
      ) : (
        <>
          {!showMobileWarning && <InteractiveBackground audioAnalyzer={audioAnalyzer.current} />}
          <Navbar />
          {!showMobileWarning && <InfoButton />}
          <div className="content">
            <div className="canvas-container">
              {showMobileWarning && (
                <div className="mobile-logo">ToneLab 2.0</div>
              )}
              <div className="particles">
                {Array.from({ length: 200 }).map((_, i) => {
                  // Calculate random positions across the container
                  const left = `${Math.random() * 100}%`;
                  const top = `${Math.random() * 100}%`;
                  
                  return (
                    <div 
                      key={i} 
                      className="particle" 
                      style={{
                        left,
                        top,
                        opacity: 0.3,
                        visibility: 'visible'
                      }}
                    />
                  );
                })}
              </div>
              <div className="canvas-wrapper">
                {!isEmptyCanvas && !showMobileWarning && (
                  <div className="canvas-buttons">
                    <Button
                      variant="outline"
                      className="clear-btn"
                      onClick={handleOnClear}
                      title="Clear all the balls"
                    >
                      Clear
                    </Button>
                    <Button
                      variant={isRecording ? "solid" : "outline"}
                      className={`record-btn ${isRecording ? 'recording' : ''}`}
                      onClick={handleRecordToggle}
                      title={isRecording ? "Stop recording" : "Record the audio"}
                      disabled={isEmptyCanvas}
                    >
                      {isRecording ? "Stop" : "Record"}
                    </Button>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  onClick={handleClick}
                  width={WIDTH}
                  height={HEIGHT}
                  style={{ 
                    border: "1px solid #222", 
                    marginTop: "0px",
                    maxWidth: showMobileWarning ? "95%" : "auto",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                  }}
                ></canvas>
                {isEmptyCanvas && (
                  <div className="empty-canvas-text">
                    <p>Click inside the canvas to begin</p>
                  </div>
                )}
              </div>
              {showMobileWarning && (
                <div className="mobile-warning">
                  <p>
                    ToneLab works best on larger screens. For the full experience with all controls and effects, 
                    please switch to desktop view.
                  </p>
                </div>
              )}
            </div>
            <div className="controls">
              <div className="card">
                <label>Waveform</label>
                <StyledSelect
                  value={waveform}
                  onChange={(e) => setWaveform(e.target.value)}
                >
                  <option value="sine">Sine</option>
                  <option value="square">Square</option>
                  <option value="triangle">Triangle</option>
                  <option value="sawtooth">Sawtooth</option>
                </StyledSelect>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label>Scale</label>
                    <StyledSelect
                      value={selectedScaleType}
                      onChange={(e) => setSelectedScaleType(e.target.value)}
                    >
                      {Object.keys(SCALE_PATTERNS).map((scale) => (
                        <option key={scale} value={scale}>
                          {scale}
                        </option>
                      ))}
                      <option value="Chromatic">Chromatic</option>
                    </StyledSelect>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label>Key</label>
                    <StyledSelect
                      value={selectedKey}
                      onChange={(e) => setSelectedKey(e.target.value)}
                    >
                      {ALL_NOTES.map((note) => (
                        <option key={note} value={note}>
                          {note}
                        </option>
                      ))}
                    </StyledSelect>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label>Octave</label>
                    <StyledSelect
                      value={selectedOctave}
                      onChange={(e) => setSelectedOctave(parseInt(e.target.value))}
                    >
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </StyledSelect>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff' }}>Envelope</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', margin: '16px 0' }}>
                  <Knob
                    value={attack}
                    min={0.01}
                    max={1}
                    onChange={setAttack}
                    label="Attack"
                    displayValue={value => value.toFixed(2)}
                  />
                  <Knob
                    value={decay}
                    min={0.01}
                    max={1}
                    onChange={setDecay}
                    label="Decay"
                    displayValue={value => value.toFixed(2)}
                  />
                  <Knob
                    value={sustain}
                    min={0.01}
                    max={1}
                    onChange={setSustain}
                    label="Sustain"
                    displayValue={value => value.toFixed(2)}
                  />
                  <Knob
                    value={release}
                    min={0.01}
                    max={3}
                    onChange={setRelease}
                    label="Release"
                    displayValue={value => value.toFixed(2)}
                  />
                </div>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff' }}>Effects</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label>Delay Mix: {delayMix.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={delayMix}
                      onChange={(e) => setDelayMix(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>Reverb Mix: {reverbMix.toFixed(2)}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={reverbMix}
                      onChange={(e) => setReverbMix(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff' }}>Filters</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label>Lowpass: {lowpassFrequency.toFixed(0)} Hz</label>
                    <input
                      type="range"
                      min="20"
                      max="20000"
                      step="1"
                      value={lowpassFrequency}
                      onChange={(e) => setLowpassFrequency(parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>Highpass: {highpassFrequency.toFixed(0)} Hz</label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="1"
                      value={highpassFrequency}
                      onChange={(e) => setHighpassFrequency(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff' }}>Output</h3>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  padding: '20px 0 30px', 
                  height: '200px'
                }}>
                  <Knob
                    value={gainValue}
                    min={0}
                    max={0.8}
                    onChange={setGainValue}
                    label="Gain"
                    displayValue={value => `${(value * 100).toFixed(0)}%`}
                    size={130}
                    color="#01a39b"
                  />
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;

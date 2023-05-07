import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";
import * as Tone from "tone";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import styled from "styled-components";
import { Button } from "./components/ds";

const WIDTH = 1000;
const HEIGHT = 680;

const A_MINOR_SCALE = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4"];

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

const getControlInitialState = () => {
  return {
    attack: 0.01,
    decay: 0.2,
    sustain: 0.2,
    release: 1,
    delayMix: 0.5,
    reverbMix: 0.5,
    ballSpeed: 1,
    prevBallSpeed: 1,
    gain: 0.5,
    lowpassFrequency: 20000,
    highpassFrequency: 0,
    waveform: "sine",
  };
};

const controlReducer = (state, action) => {
  switch (action.type) {
    case "UPDATE_ATTACK": {
      return {
        ...state,
        attack: action.value,
      };
    }
    case "UPDATE_DECAY": {
      return {
        ...state,
        decay: action.value,
      };
    }
    case "UPDATE_SUSTAIN": {
      return {
        ...state,
        sustain: action.value,
      };
    }
    case "UPDATE_RELEASE": {
      return {
        ...state,
        release: action.value,
      };
    }
    case "UPDATE_DELAY_MIX": {
      return {
        ...state,
        delayMix: action.value,
      };
    }
    case "UPDATE_REVERB_MIX": {
      return {
        ...state,
        reverbMix: action.value,
      };
    }
    case "UPDATE_BALL_SPEED": {
      return {
        ...state,
        ballSpeed: action.value,
      };
    }
    case "UPDATE_PREV_BALL_SPEED": {
      return {
        ...state,
        prevBallSpeed: action.value,
      };
    }
    case "UPDATE_GAIN": {
      return {
        ...state,
        gain: action.value,
      };
    }
    case "UPDATE_LOWPASS_FREQUENCY": {
      return {
        ...state,
        lowpassFrequency: action.value,
      };
    }
    case "UPDATE_HIGHPASS_FREQUENCY": {
      return {
        ...state,
        highpassFrequency: action.value,
      };
    }
    case "UPDATE_WAVEFORM": {
      return {
        ...state,
        waveform: action.value,
      };
    }
    default:
      return state;
  }
};

function App() {
  const canvasRef = useRef(null);
  const balls = useRef([]);
  const synth = useRef(null);
  const delay = useRef(null);
  const reverb = useRef(null);
  const gain = useRef(null);
  const lowpassFilter = useRef(null);
  const highpassFilter = useRef(null);

  const [controlState, controlDispatch] = useReducer(
    controlReducer,
    getControlInitialState()
  );

  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [isEmptyCanvas, setIsEmptyCanvas] = useState(true);

  useEffect(() => {
    const particles = document.querySelectorAll(".particle");

    particles.forEach((particle) => {
      const x = Math.random();
      const y = Math.random();
      const duration = 5 + Math.random() * 5;

      particle.style.setProperty("--x", x);
      particle.style.setProperty("--y", y);
      particle.style.setProperty("--duration", `${duration}s`);
      particle.style.animationDuration = `${duration}s`;
    });
  }, []);

  //@TODO: Move useEffect to handler for waveform change
  useEffect(() => {
    synth.current = new Tone.Synth({
      oscillator: {
        type: controlState.waveform, // Use the waveform from the state
      },
    });

    delay.current = new Tone.FeedbackDelay(0.5);
    reverb.current = new Tone.Reverb(1.5);
    gain.current = new Tone.Gain().toDestination();
    lowpassFilter.current = new Tone.Filter(20000, "lowpass");
    highpassFilter.current = new Tone.Filter(0, "highpass");
    synth.current.chain(
      highpassFilter.current,
      lowpassFilter.current,
      delay.current,
      reverb.current,
      gain.current
    );
  }, [controlState.waveform]);

  useEffect(() => {
    synth.current.set({
      envelope: {
        attack: controlState.attack,
        decay: controlState.decay,
        sustain: controlState.sustain,
        release: controlState.release,
      },
    });
  }, [
    controlState.attack,
    controlState.decay,
    controlState.sustain,
    controlState.release,
  ]);

  const handleCanvasClick = (event) => {
    const { ballSpeed } = controlState;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = (Math.random() - 0.5) * ballSpeed * 5;
    const dy = (Math.random() - 0.5) * ballSpeed * 5;

    const randomColor = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${
      Math.random() * 255
    }, 1)`;

    balls.current.push(new Ball(x, y, dx, dy, randomColor));
    setIsEmptyCanvas(false);
  };

  function debounce(func, wait, immediate) {
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
  }

  useEffect(() => {
    /**
     * Detect and show warning if the accessing device
     * is a mobile.
     */
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

  const drawBallsOnCanvas = useCallback((currentBallSpeed, prevBallSpeed) => {
    const canvas = canvasRef.current;

    const ctx = canvas.getContext("2d");

    const updateBall = (ball) => {
      ball.x += (ball.dx * currentBallSpeed) / prevBallSpeed;
      ball.y += (ball.dy * currentBallSpeed) / prevBallSpeed;

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

    const playRandomNote = debounce(() => {
      synth.current.triggerAttackRelease(randomElement(A_MINOR_SCALE), "8n");
    }, 50);

    const animateBallTouch = (ball) => {
      const pulseElement = document.createElement("div");
      pulseElement.classList.add("pulse");
      pulseElement.style.left = `${ball.x - 10}px`;
      pulseElement.style.top = `${ball.y - 10}px`;
      pulseElement.style.backgroundColor = ball.color;
      document.body.appendChild(pulseElement);

      setTimeout(() => {
        document.body.removeChild(pulseElement);
      }, 1000);
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const ball of balls.current) {
        updateBall(ball);
        drawBall(ball);
      }

      requestAnimationFrame(render);
    };

    render();
  }, []);

  const handleWaveformChange = (e) => {
    controlDispatch({
      type: "UPDATE_WAVEFORM",
      value: e.target.value,
    });
  };

  const handleAttackChange = (e) => {
    controlDispatch({
      type: "UPDATE_ATTACK",
      value: e.target.valueAsNumber,
    });
  };

  const handleDecayChange = (e) => {
    controlDispatch({
      type: "UPDATE_DECAY",
      value: e.target.valueAsNumber,
    });
  };

  const handleSustainChange = (e) => {
    controlDispatch({
      type: "UPDATE_SUSTAIN",
      value: e.target.valueAsNumber,
    });
  };

  const handleReleaseChange = (e) => {
    controlDispatch({
      type: "UPDATE_RELEASE",
      value: e.target.valueAsNumber,
    });
  };

  const handleDelayMixChange = (e) => {
    delay.current.wet.value = e.target.valueAsNumber;
    controlDispatch({
      type: "UPDATE_DELAY_MIX",
      value: e.target.valueAsNumber,
    });
  };

  const handleReverbMixChange = (e) => {
    reverb.current.wet.value = e.target.valueAsNumber;
    controlDispatch({
      type: "UPDATE_REVERB_MIX",
      value: e.target.valueAsNumber,
    });
  };

  const handleBallSpeedChange = (e) => {
    controlDispatch({
      type: "UPDATE_PREV_BALL_SPEED",
      value: controlState.ballSpeed,
    });
    controlDispatch({
      type: "UPDATE_BALL_SPEED",
      value: e.target.valueAsNumber,
    });
    drawBallsOnCanvas(e.target.valueAsNumber, controlState.ballSpeed);
  };

  const handleGainChange = (e) => {
    gain.current.gain.value = e.target.valueAsNumber;
    controlDispatch({
      type: "UPDATE_GAIN",
      value: e.target.valueAsNumber,
    });
  };

  const handleHighpassFrequencyChange = (e) => {
    highpassFilter.current.frequency.value = e.target.valueAsNumber;
    controlDispatch({
      type: "UPDATE_HIGHPASS_FREQUENCY",
      value: e.target.valueAsNumber,
    });
  };

  const handleLowpassFrequencyChange = (e) => {
    lowpassFilter.current.frequency.value = e.target.valueAsNumber;
    controlDispatch({
      type: "UPDATE_LOWPASS_FREQUENCY",
      value: e.target.valueAsNumber,
    });
  };

  /**
   * Performs the necessary actions to wipe out
   * all the balls in the canvas.
   */
  const handleOnClear = () => {
    balls.current = [];
    setIsEmptyCanvas(true);
  };

  return (
    <div className="App">
      <Navbar />
      <div className="controls">
        <div className="card">
          <label>Waveform</label>
          <StyledSelect
            value={controlState.waveform}
            onChange={handleWaveformChange}
          >
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
            <option value="sawtooth">Sawtooth</option>
          </StyledSelect>
        </div>
        <div className="card">
          <label>Attack: {controlState.attack.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={controlState.attack}
            onChange={handleAttackChange}
          />
        </div>
        <div className="card">
          <label>Decay: {controlState.decay.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={controlState.decay}
            onChange={handleDecayChange}
          />
        </div>
        <div className="card">
          <label>Sustain: {controlState.sustain.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={controlState.sustain}
            onChange={handleSustainChange}
          />
        </div>
        <div className="card">
          <label>Release: {controlState.release.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="3"
            step="0.01"
            value={controlState.release}
            onChange={handleReleaseChange}
          />
        </div>
        <div className="card">
          <label>Delay Mix: {controlState.delayMix.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controlState.delayMix}
            onChange={handleDelayMixChange}
          />
        </div>
        <div className="card">
          <label>Reverb Mix: {controlState.reverbMix.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={controlState.reverbMix}
            onChange={handleReverbMixChange}
          />
        </div>
        <div className="card">
          <label>
            Ball Speed (Unstable): {controlState.ballSpeed.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={controlState.ballSpeed}
            onChange={handleBallSpeedChange}
          />
        </div>
        <div className="card">
          <label>Gain: {(controlState.gain * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={controlState.gain}
            onChange={handleGainChange}
          />
        </div>
        <div className="card">
          <label>
            Lowpass Frequency: {controlState.lowpassFrequency.toFixed(0)} Hz
          </label>
          <input
            type="range"
            min="20"
            max="20000"
            step="1"
            value={controlState.lowpassFrequency}
            onChange={handleLowpassFrequencyChange}
          />
        </div>
        <div className="card">
          <label>
            Highpass Frequency: {controlState.highpassFrequency.toFixed(0)} Hz
          </label>
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            value={controlState.highpassFrequency}
            onChange={handleHighpassFrequencyChange}
          />
        </div>
      </div>
      <div className="canvas-container">
        <div className="particles">
          {Array.from({ length: 500 }).map((_, i) => (
            <div key={i} className="particle"></div>
          ))}
        </div>
        <div className="canvas-wrapper">
          {!isEmptyCanvas && (
            <Button
              variant="outline"
              className="clear-btn"
              onClick={handleOnClear}
              title="Clear all the balls"
            >
              ❌ Clear
            </Button>
          )}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            width={WIDTH}
            height={HEIGHT}
            style={{ border: "1px solid #222", marginTop: "16px" }}
          ></canvas>
          {isEmptyCanvas && (
            <div className="empty-canvas-text">
              <p>Click inside the canvas to begin</p>
            </div>
          )}
        </div>
      </div>
      <Footer />

      {showMobileWarning && (
        <div className="mobile-warning">
          <p>
            It appears that you're on a mobile device. To access the full range
            of ToneLab's features and controls, we recommend switching to
            desktop view.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;

import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import * as Tone from 'tone';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

const WIDTH = 800;
const HEIGHT = 560;

const A_MINOR_SCALE = ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4'];

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

function App() {
  const canvasRef = useRef(null);
  const balls = useRef([]);
  const synth = useRef(null);
  const delay = useRef(null);
  const reverb = useRef(null);
  const gain = useRef(null);

  const [attack, setAttack] = useState(0.01);
  const [decay, setDecay] = useState(0.2);
  const [sustain, setSustain] = useState(0.2);
  const [release, setRelease] = useState(1);

  const [delayMix, setDelayMix] = useState(0.5);
  const [reverbMix, setReverbMix] = useState(0.5);
  const [ballSpeed, setBallSpeed] = useState(1);
  const [prevBallSpeed, setPrevBallSpeed] = useState(1);

  const [gainValue, setGainValue] = useState(0.5);

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

  useEffect(() => {
    synth.current = new Tone.Synth({
      oscillator: {
        type: "sine",
      },
    });
  
    delay.current = new Tone.FeedbackDelay(0.5);
    reverb.current = new Tone.Reverb(1.5);
    gain.current = new Tone.Gain().toDestination();
    synth.current.chain(delay.current, reverb.current, gain.current);
  }, []);
  

  useEffect(() => {
    synth.current.set({
      envelope: {
        attack: attack,
        decay: decay,
        sustain: sustain,
        release: release,
      },
    });
  }, [attack, decay, sustain, release]);

  useEffect(() => {
    delay.current.wet.value = delayMix;
  }, [delayMix]);

  useEffect(() => {
    reverb.current.wet.value = reverbMix;
  }, [reverbMix]);

  useEffect(() => {
    gain.current.gain.value = gainValue;
  }, [gainValue]);
  
  const handleClick = (event) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = (Math.random() - 0.5) * ballSpeed * 5;
    const dy = (Math.random() - 0.5) * ballSpeed * 5;
  
    const randomColor = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 1)`;
  
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

  useEffect(() => {
    const canvas = canvasRef.current;
    
    const ctx = canvas.getContext('2d');

    const updateBall = (ball) => {
      ball.x += ball.dx * ballSpeed / prevBallSpeed;
      ball.y += ball.dy * ballSpeed / prevBallSpeed;

      if (ball.x < 10 || ball.x > WIDTH - 10) {
        ball.dx = -ball.dx;
        playRandomNote();
      }

      if (ball.y < 10 || ball.y > HEIGHT - 10) {
        ball.dy = -ball.dy;
        playRandomNote();
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
      synth.current.triggerAttackRelease(randomElement(A_MINOR_SCALE), '8n');
    }, 100);
    

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const ball of balls.current) {
        updateBall(ball);
        drawBall(ball);
      }

      requestAnimationFrame(render);
    };

    render();
  }, [ballSpeed, prevBallSpeed]); // Add prevBallSpeed here

  useEffect(() => {
    setPrevBallSpeed(ballSpeed);
  }, [ballSpeed]);

  return (
    <div className="App">
            <Navbar />
      <div className="controls">
        <div className="card">
          <label>Attack: {attack.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={attack}
            onChange={(e) => setAttack(parseFloat(e.target.value))}
          />
        </div>
        <div className="card">
          <label>Decay: {decay.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={decay}
            onChange={(e) => setDecay(parseFloat(e.target.value))}
          />
        </div>
        <div className="card">
          <label>Sustain: {sustain.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={sustain}
            onChange={(e) => setSustain(parseFloat(e.target.value))}
          />
        </div>
        <div className="card">
          <label>Release: {release.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="3"
            step="0.01"
            value={release}
            onChange={(e) => setRelease(parseFloat(e.target.value))}
          />
        </div>
        <div className="card">
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
        <div className="card">
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
        <div className="card">
          <label>Ball Speed (Unstable): {ballSpeed.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={ballSpeed}
            onChange={(e) => setBallSpeed(parseFloat(e.target.value))}
          />
        </div>
        <div  className="card">
          <label>Gain: {(gainValue * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={gainValue}
            onChange={(e) => setGainValue(parseFloat(e.target.value))}
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
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        width={WIDTH}
        height={HEIGHT}
        style={{ border: '1px solid #222', marginTop: '16px' }}
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
        It appears that you're on a mobile device. To access the full range of ToneLab's features and controls, we recommend switching to desktop view.
        </p>
      </div>
    )}
    </div>
  );
}  

export default App;

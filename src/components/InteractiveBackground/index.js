import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const InteractiveBackground = ({ audioAnalyzer }) => {
  const containerRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const waveformsRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const timeRef = useRef(0);
  const raycasterRef = useRef(null);
  const mousePositionRef = useRef(new THREE.Vector2());
  const ripplePointsRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0f0f0f, 1);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup raycaster for mouse interactions
    const raycaster = new THREE.Raycaster();
    raycasterRef.current = raycaster;

    // Create a plane for mouse intersection
    const interactionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    interactionPlane.rotation.x = -Math.PI / 2;
    scene.add(interactionPlane);
    
    // Create waveforms for different frequency bands
    const waveforms = [];
    const waveformCount = 5;
    const frequencyBands = [
      { name: 'sub-bass', color: new THREE.Color('#015b55') },
      { name: 'bass', color: new THREE.Color('#01a39b') },
      { name: 'mid-low', color: new THREE.Color('#02c4bb') },
      { name: 'mid-high', color: new THREE.Color('#02d4ca') },
      { name: 'high', color: new THREE.Color('#01a39b') }
    ];

    // Create a circular grid for reference (subtle background element)
    const gridGeometry = new THREE.BufferGeometry();
    const gridLines = 15;
    const gridPoints = [];
    const gridColors = [];

    // Create radial lines
    for (let i = 0; i < gridLines; i++) {
      const angle = (i / gridLines) * Math.PI * 2;
      const innerRadius = 2;
      const outerRadius = 15;
      
      // Starting point (inner)
      gridPoints.push(
        innerRadius * Math.cos(angle),
        0,
        innerRadius * Math.sin(angle)
      );
      
      // Ending point (outer)
      gridPoints.push(
        outerRadius * Math.cos(angle),
        0,
        outerRadius * Math.sin(angle)
      );
      
      // Colors for gradient effect
      const color = new THREE.Color('#01a39b');
      color.multiplyScalar(0.1); // Make it subtle
      gridColors.push(color.r, color.g, color.b);
      gridColors.push(0, 0, 0); // Fade to black at the edges
    }
    
    // Create circular rings
    const ringCount = 5;
    for (let i = 0; i < ringCount; i++) {
      const radius = 2 + (i * 3);
      const segments = 64;
      
      for (let j = 0; j < segments; j++) {
        const angle1 = (j / segments) * Math.PI * 2;
        const angle2 = ((j + 1) / segments) * Math.PI * 2;
        
        gridPoints.push(
          radius * Math.cos(angle1),
          0,
          radius * Math.sin(angle1)
        );
        
        gridPoints.push(
          radius * Math.cos(angle2),
          0,
          radius * Math.sin(angle2)
        );
        
        const opacity = 0.1 - (i / ringCount) * 0.08;
        const color = new THREE.Color('#01a39b');
        color.multiplyScalar(opacity);
        
        gridColors.push(color.r, color.g, color.b);
        gridColors.push(color.r, color.g, color.b);
      }
    }

    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
    gridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));
    
    const gridMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2; // Rotate to be horizontal
    scene.add(grid);

    // Create waveforms
    for (let i = 0; i < waveformCount; i++) {
      const points = [];
      const segments = 128;
      const radius = 4 + i * 2.5;
      
      // Create an initial circle shape for each waveform
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          radius * Math.cos(angle),
          0,
          radius * Math.sin(angle)
        ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: frequencyBands[i].color,
        linewidth: 2,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const waveform = new THREE.Line(geometry, material);
      waveform.userData = {
        radius,
        band: i,
        points: points.slice(),
        originalPoints: points.slice()
      };
      
      waveform.rotation.x = Math.PI / 2; // Rotate to be horizontal
      scene.add(waveform);
      waveforms.push(waveform);
    }
    
    waveformsRef.current = waveforms;

    // Create interactive nodes at key points on the waveforms
    const interactiveNodes = [];
    const nodeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    
    // Create nodes on each waveform
    for (let i = 0; i < waveformCount; i++) {
      const nodeCount = 8;
      const radius = 4 + i * 2.5;
      
      for (let j = 0; j < nodeCount; j++) {
        const angle = (j / nodeCount) * Math.PI * 2;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        
        const color = new THREE.Color('#02c4bb');
        const material = new THREE.MeshBasicMaterial({ 
          color: color, 
          transparent: true,
          opacity: 0.7 
        });
        
        const node = new THREE.Mesh(nodeGeometry, material);
        node.position.set(x, 0, z);
        node.rotation.x = Math.PI / 2;
        node.userData = {
          waveformIndex: i,
          nodeIndex: j,
          baseRadius: radius,
          angle: angle,
          hovered: false,
          pulsing: false,
          pulseTime: 0,
          originalScale: 1
        };
        
        scene.add(node);
        interactiveNodes.push(node);
      }
    }

    // Create ripple effect pool
    const createRipple = (x, z) => {
      // Create a ripple effect at the clicked position
      const rippleGeometry = new THREE.BufferGeometry();
      const rippleSegments = 64;
      const ripplePoints = [];
      
      for (let i = 0; i <= rippleSegments; i++) {
        const angle = (i / rippleSegments) * Math.PI * 2;
        const radius = 0.5; // Start small
        ripplePoints.push(
          x + radius * Math.cos(angle),
          0,
          z + radius * Math.sin(angle)
        );
      }
      
      rippleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ripplePoints, 3));
      
      const rippleMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color('#02c4bb'),
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      });
      
      const ripple = new THREE.Line(rippleGeometry, rippleMaterial);
      ripple.rotation.x = Math.PI / 2;
      ripple.userData = {
        centerX: x,
        centerZ: z,
        radius: 0.5,
        time: 0,
        maxRadius: 15,
        alive: true
      };
      
      scene.add(ripple);
      ripplePointsRef.current.push(ripple);
      
      return ripple;
    };

    // Add some ambient dust particles for depth
    const particleCount = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Position particles in a large sphere
      const radius = 10 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Set sizes - very small for dust effect
      particleSizes[i] = Math.random() * 0.5 + 0.1;
      
      // Set colors - subtle teal
      const brightness = 0.1 + Math.random() * 0.2;
      const color = new THREE.Color('#01a39b');
      color.multiplyScalar(brightness);
      
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse handlers 
    const handleMouseMove = (event) => {
      // Update normalized mouse position
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Set for raycaster
      mousePositionRef.current.x = mouseRef.current.x;
      mousePositionRef.current.y = mouseRef.current.y;
      
      // Calculate world position of mouse for distortion effect
      raycaster.setFromCamera(mousePositionRef.current, camera);
      const intersects = raycaster.intersectObject(interactionPlane);
      
      if (intersects.length > 0) {
        mouseRef.current.worldX = intersects[0].point.x;
        mouseRef.current.worldZ = intersects[0].point.z;
      }
      
      // Check for hover over interactive nodes
      const nodeIntersects = raycaster.intersectObjects(interactiveNodes);
      
      // Reset all nodes to non-hover state
      interactiveNodes.forEach(node => {
        node.userData.hovered = false;
        if (!node.userData.pulsing) {
          node.scale.set(1, 1, 1);
        }
      });
      
      // Set hover state for intersected node
      if (nodeIntersects.length > 0) {
        const node = nodeIntersects[0].object;
        node.userData.hovered = true;
        node.scale.set(1.5, 1.5, 1.5);
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }
    };
    
    const handleMouseDown = (event) => {
      mouseRef.current.active = true;
      
      // Create ripple effect at click position
      raycaster.setFromCamera(mousePositionRef.current, camera);
      const intersects = raycaster.intersectObject(interactionPlane);
      
      if (intersects.length > 0) {
        const x = intersects[0].point.x;
        const z = intersects[0].point.z;
        createRipple(x, z);
        
        // Make waveforms react strongly to the click
        waveforms.forEach(waveform => {
          waveform.userData.clickImpulse = 1.0; // Full impulse
          waveform.userData.clickX = x;
          waveform.userData.clickZ = z;
        });
      }
      
      // Check for clicks on interactive nodes
      const nodeIntersects = raycaster.intersectObjects(interactiveNodes);
      
      if (nodeIntersects.length > 0) {
        const node = nodeIntersects[0].object;
        node.userData.pulsing = true;
        node.userData.pulseTime = 0;
        node.userData.originalScale = node.scale.x;
        
        // Create ripple at node position
        createRipple(node.position.x, node.position.z);
        
        // Trigger an impulse on its waveform
        const waveformIndex = node.userData.waveformIndex;
        waveforms[waveformIndex].userData.nodeImpulse = 1.0;
        waveforms[waveformIndex].userData.nodeAngle = node.userData.angle;
      }
    };
    
    const handleMouseUp = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      timeRef.current += 0.01;
      
      // Update raycaster
      raycaster.setFromCamera(mousePositionRef.current, camera);
      
      // Gentle rotation of the entire scene based on mouse position
      const targetRotationX = mouseRef.current.y * 0.2;
      const targetRotationY = mouseRef.current.x * 0.2;
      
      scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.05;
      scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.05;
      
      // Update interactive nodes
      interactiveNodes.forEach(node => {
        // Update pulsing nodes
        if (node.userData.pulsing) {
          node.userData.pulseTime += 0.05;
          const pulse = 1 + Math.sin(node.userData.pulseTime * 5) * 0.3;
          node.scale.set(pulse, pulse, pulse);
          
          node.material.opacity = 1 - (node.userData.pulseTime / 2);
          
          // Stop pulsing after some time
          if (node.userData.pulseTime > 2) {
            node.userData.pulsing = false;
            node.scale.set(1, 1, 1);
            node.material.opacity = 0.7;
          }
        }
        
        // Make nodes follow their waveform
        const waveform = waveforms[node.userData.waveformIndex];
        const angle = node.userData.angle;
        const radius = waveform.userData.radius;
        
        // Get the exact position on the waveform at this angle
        const positions = waveform.geometry.attributes.position.array;
        const segmentIndex = Math.floor((angle / (Math.PI * 2)) * 128);
        const x = positions[segmentIndex * 3];
        const z = positions[segmentIndex * 3 + 2];
        
        node.position.x = x;
        node.position.z = z;
      });
      
      // Update ripple effects
      ripplePointsRef.current.forEach((ripple, index) => {
        ripple.userData.time += 0.04;
        ripple.userData.radius += 0.2;
        
        // Update ripple size and opacity
        const positions = ripple.geometry.attributes.position.array;
        const segments = positions.length / 3;
        
        for (let i = 0; i < segments; i++) {
          const angle = (i / (segments - 1)) * Math.PI * 2;
          positions[i * 3] = ripple.userData.centerX + ripple.userData.radius * Math.cos(angle);
          positions[i * 3 + 2] = ripple.userData.centerZ + ripple.userData.radius * Math.sin(angle);
        }
        
        ripple.geometry.attributes.position.needsUpdate = true;
        
        // Fade out based on time
        ripple.material.opacity = 1 - (ripple.userData.time / 2);
        
        // Remove ripple when it gets too big or fades out
        if (ripple.userData.radius > ripple.userData.maxRadius || ripple.material.opacity <= 0) {
          scene.remove(ripple);
          ripple.geometry.dispose();
          ripple.material.dispose();
          ripple.userData.alive = false;
        }
      });
      
      // Filter out dead ripples
      ripplePointsRef.current = ripplePointsRef.current.filter(r => r.userData.alive);
      
      // Baseline animation even without audio
      waveforms.forEach((waveform, index) => {
        const positions = waveform.geometry.attributes.position.array;
        const radius = waveform.userData.radius;
        const band = waveform.userData.band;
        
        // Apply mouse distortion effect
        const mouseX = mouseRef.current.worldX || 0;
        const mouseZ = mouseRef.current.worldZ || 0;
        const isMouseActive = mouseRef.current.active;
        
        // Update click impulse and node impulse values
        if (waveform.userData.clickImpulse > 0) {
          waveform.userData.clickImpulse *= 0.95; // Decay
        }
        
        if (waveform.userData.nodeImpulse > 0) {
          waveform.userData.nodeImpulse *= 0.95; // Decay
        }
        
        // Update wave form based on time, mouse position, and impulses
        for (let i = 0; i <= 128; i++) {
          const angle = (i / 128) * Math.PI * 2;
          const timeOffset = timeRef.current + (band * 0.2);
          
          // Default wave animation
          const defaultWave = Math.sin(angle * 8 + timeOffset) * 0.1 + 
                             Math.sin(angle * 4 - timeOffset * 0.5) * 0.05;
          
          // Calculate distance to mouse for distortion
          const pointX = radius * Math.cos(angle);
          const pointZ = radius * Math.sin(angle);
          const distToMouse = Math.sqrt((pointX - mouseX) ** 2 + (pointZ - mouseZ) ** 2);
          const mouseFactor = isMouseActive ? 0.2 : 0.1;
          const mouseDistortion = Math.max(0, 2 - distToMouse) * mouseFactor;
          
          // Calculate click impulse effect
          let clickEffect = 0;
          if (waveform.userData.clickImpulse > 0.01) {
            const clickX = waveform.userData.clickX || 0;
            const clickZ = waveform.userData.clickZ || 0;
            const distToClick = Math.sqrt((pointX - clickX) ** 2 + (pointZ - clickZ) ** 2);
            // Wave ripple effect from click point
            const ripplePhase = distToClick - timeRef.current * 5;
            clickEffect = Math.sin(ripplePhase) * Math.exp(-distToClick / 3) * waveform.userData.clickImpulse;
          }
          
          // Calculate node impulse effect
          let nodeEffect = 0;
          if (waveform.userData.nodeImpulse > 0.01) {
            const nodeAngle = waveform.userData.nodeAngle || 0;
            const angleDiff = Math.abs(angle - nodeAngle);
            const wrappedAngleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
            nodeEffect = Math.exp(-wrappedAngleDiff * 5) * waveform.userData.nodeImpulse;
          }
          
          // Combine all effects
          const finalRadius = radius + defaultWave + mouseDistortion + clickEffect * 2 + nodeEffect * 2;
          
          const x = finalRadius * Math.cos(angle);
          const z = finalRadius * Math.sin(angle);
          
          positions[i * 3] = x;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = z;
        }
        
        // Audio reactivity
        if (audioAnalyzer) {
          try {
            const freqData = new Uint8Array(audioAnalyzer.frequencyBinCount);
            audioAnalyzer.getByteFrequencyData(freqData);
            
            // Map different waveforms to different frequency ranges
            const bandSize = Math.floor(freqData.length / waveformCount);
            const startBin = band * bandSize;
            const endBin = startBin + bandSize;
            
            // Calculate average for this band
            let bandAvg = 0;
            for (let i = startBin; i < endBin; i++) {
              bandAvg += freqData[i];
            }
            bandAvg /= bandSize;
            bandAvg /= 255.0;
            
            // Make waveform color pulse with audio intensity
            const color = frequencyBands[band].color.clone();
            const intensityBoost = 1 + bandAvg * 1.5; // More dramatic color change
            color.multiplyScalar(intensityBoost);
            waveform.material.color = color;
            
            // Process this frequency band
            for (let i = 0; i <= 128; i++) {
              const angle = (i / 128) * Math.PI * 2;
              
              // Map this angle position to a frequency bin
              const binIndex = Math.floor((i / 128) * bandSize) + startBin;
              const value = freqData[binIndex] / 255.0;
              
              // Scale the radius based on frequency intensity
              const waveAmplitude = value * 1.0 * (band + 1) * 0.6; // Increased amplitude
              
              positions[i * 3] += Math.cos(angle) * waveAmplitude;
              positions[i * 3 + 2] += Math.sin(angle) * waveAmplitude;
              
              // Create small perpendicular distortions for higher frequencies
              if (band >= 3 && value > 0.5) {
                const perpDist = (value - 0.5) * 0.5 * Math.sin(angle * 16 + timeRef.current * 10);
                positions[i * 3] += Math.sin(angle) * perpDist;
                positions[i * 3 + 2] -= Math.cos(angle) * perpDist;
              }
            }
          } catch (e) {
            console.error("Audio analyzer error:", e);
          }
        }
        
        waveform.geometry.attributes.position.needsUpdate = true;
      });

      // Gently animate particles
      if (particles) {
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          // Slow drift motion
          positions[i3] += Math.sin(timeRef.current * 0.1 + i) * 0.005;
          positions[i3 + 1] += Math.cos(timeRef.current * 0.1 + i) * 0.005;
          positions[i3 + 2] += Math.sin(timeRef.current * 0.1 + i * 0.5) * 0.005;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      
      document.body.style.cursor = 'default';
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of all geometries and materials
      waveforms.forEach(waveform => {
        waveform.geometry.dispose();
        waveform.material.dispose();
      });
      
      interactiveNodes.forEach(node => {
        node.geometry.dispose();
        node.material.dispose();
      });
      
      ripplePointsRef.current.forEach(ripple => {
        ripple.geometry.dispose();
        ripple.material.dispose();
      });
      
      gridGeometry.dispose();
      gridMaterial.dispose();
      
      particleGeometry.dispose();
      particleMaterial.dispose();
      
      interactionPlane.geometry.dispose();
      interactionPlane.material.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: '#0f0f0f',
        cursor: 'default'
      }}
    />
  );
};

export default InteractiveBackground; 
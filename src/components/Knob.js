import React, { useState, useRef, useEffect, useCallback } from 'react';

const Knob = ({ 
  value, 
  min, 
  max, 
  onChange, 
  size = 60,
  color = '#01a39b', 
  label,
  displayValue
}) => {
  const knobRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  // Convert value to angle for visual display
  const angle = (value - min) / (max - min) * 270 - 135;
  
  // Use useCallback to create stable function references
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    // Calculate value change based on vertical mouse movement
    // Moving mouse up increases value, moving down decreases
    const deltaY = startYRef.current - e.clientY;
    const sensitivity = (max - min) / 100; // Increased sensitivity
    
    let newValue = startValueRef.current + deltaY * sensitivity;
    
    // Clamp value to min/max range
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Round to 2 decimal places to avoid floating point issues
    newValue = Math.round(newValue * 100) / 100;
    
    onChange(newValue);
  }, [isDragging, min, max, onChange]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  }, [handleMouseMove]);
  
  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    
    // Add mouse event listeners to document for better capture
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize'; // Show up-down cursor
  }, [value, handleMouseMove, handleMouseUp]);
  
  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startValueRef.current = value;
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [value]);
  
  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - e.touches[0].clientY;
    const sensitivity = (max - min) / 100;
    
    let newValue = startValueRef.current + deltaY * sensitivity;
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue * 100) / 100;
    
    onChange(newValue);
  }, [isDragging, min, max, onChange]);
  
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);
  
  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.cursor = 'default';
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);
  
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        userSelect: 'none'
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#222',
          border: `2px solid ${isDragging ? color : '#333'}`,
          position: 'relative',
          cursor: 'ns-resize',
          transform: `rotate(${angle}deg)`,
          boxShadow: isDragging ? `0 0 8px ${color}` : '0 2px 4px rgba(0, 0, 0, 0.3)',
          transition: 'box-shadow 0.1s ease, border 0.1s ease',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Indicator mark */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '25%',
            backgroundColor: color,
            borderRadius: '3px',
          }}
        />
        {/* Ring around the knob */}
        <div 
          style={{
            position: 'absolute',
            top: '-5px',
            left: '-5px',
            right: '-5px',
            bottom: '-5px',
            borderRadius: '50%',
            borderTop: `3px solid ${color}`,
            borderLeft: '3px solid transparent',
            borderRight: '3px solid transparent',
            borderBottom: '3px solid transparent',
            transform: 'rotate(135deg)',
          }}
        />
      </div>
      
      {label && (
        <div style={{ color, marginTop: '8px', fontSize: '14px', fontWeight: '500' }}>
          {label}
        </div>
      )}
      
      {displayValue && (
        <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
          {typeof displayValue === 'function' ? displayValue(value) : value.toFixed(2)}
        </div>
      )}
    </div>
  );
};

export default Knob; 
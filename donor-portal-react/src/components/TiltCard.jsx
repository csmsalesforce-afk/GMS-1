import React, { useRef, useState, useCallback } from 'react';
import './TiltCard.css';

/**
 * TiltCard: Modern 3D Interactive Perspective Card
 * Adds realistic 3D tilt, specular lighting glare, and layered depth.
 */
export default function TiltCard({
  children,
  className = '',
  maxTilt = 8,
  perspective = 1100,
  glare = true,
  onClick,
  style = {}
}) {
  const cardRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('');
  const [glareStyle, setGlareStyle] = useState({ opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setTransformStyle(
      `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px) scale3d(1.015, 1.015, 1.015)`
    );

    if (glare) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      setGlareStyle({
        opacity: 0.35,
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 65%)`
      });
    }
  }, [maxTilt, perspective, glare]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0) scale3d(1, 1, 1)`);
    setGlareStyle({ opacity: 0 });
  };

  return (
    <div
      ref={cardRef}
      className={`tilt-card-wrapper ${isHovered ? 'tilt-hovered' : ''} ${className}`}
      style={{
        transform: transformStyle,
        ...style
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div className="tilt-card-content">
        {children}
      </div>
      {glare && (
        <div
          className="tilt-card-glare"
          style={glareStyle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

export default function TextRoll({ children, className = '', style = {}, duration = 0.25, delayStagger = 0.02 }) {
  if (typeof children !== 'string') {
    return <span className={className} style={style}>{children}</span>;
  }

  // Split string into characters (preserving spaces)
  const characters = children.split('');

  const containerVariants = {
    initial: {},
    hover: {},
  };

  const charVariants1 = {
    initial: { y: 0 },
    hover: { y: '-100%' },
  };

  const charVariants2 = {
    initial: { y: '100%' },
    hover: { y: 0 },
  };

  return (
    <motion.span
      className={`text-roll-container ${className}`}
      style={{
        display: 'inline-flex',
        overflow: 'hidden',
        position: 'relative',
        verticalAlign: 'bottom',
        cursor: 'pointer',
        ...style,
      }}
      initial="initial"
      whileHover="hover"
      variants={containerVariants}
    >
      {characters.map((char, index) => {
        if (char === ' ') {
          return <span key={index}>&nbsp;</span>;
        }

        return (
          <span
            key={index}
            style={{
              position: 'relative',
              display: 'inline-block',
              overflow: 'hidden',
              height: '1.2em',
              lineHeight: '1.2em',
            }}
          >
            {/* Top (Visible) Character */}
            <motion.span
              style={{ display: 'inline-block' }}
              variants={charVariants1}
              transition={{
                duration: duration,
                ease: [0.215, 0.610, 0.355, 1.000],
                delay: index * delayStagger,
              }}
            >
              {char}
            </motion.span>

            {/* Bottom (Shifted) Character - Animates Up */}
            <motion.span
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                display: 'inline-block',
              }}
              variants={charVariants2}
              transition={{
                duration: duration,
                ease: [0.215, 0.610, 0.355, 1.000],
                delay: index * delayStagger,
              }}
            >
              {char}
            </motion.span>
          </span>
        );
      })}
    </motion.span>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OdometerProps {
  value: number; // balance in paise
  className?: string;
  prefix?: string;
}

const Digit: React.FC<{ char: string }> = ({ char }) => {
  const isDigit = !isNaN(parseInt(char, 10));

  if (!isDigit) {
    return (
      <span style={{ display: 'inline-block', minWidth: '0.3em', textAlign: 'center' }}>
        {char}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-block',
        position: 'relative',
        overflow: 'hidden',
        height: '1.2em',
        width: '0.62em',
        verticalAlign: 'bottom',
        textAlign: 'center',
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={char}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.35,
          }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            display: 'block',
          }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export const Odometer: React.FC<OdometerProps> = ({ value, className = '', prefix = '₹' }) => {
  const isNegative = value < 0;
  const absPaise = Math.abs(value);
  const rupees = Math.floor(absPaise / 100);
  const paise = absPaise % 100;

  const formattedRupees = rupees.toLocaleString('en-IN');
  const formattedPaise = paise.toString().padStart(2, '0');
  const fullString = `${isNegative ? '-' : ''}${prefix}${formattedRupees}.${formattedPaise}`;

  return (
    <span
      className={`odometer-counter tabular-nums ${className}`}
      style={{
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-flex',
        alignItems: 'baseline',
      }}
    >
      {fullString.split('').map((char, index) => (
        <Digit key={`${index}-${char}`} char={char} />
      ))}
    </span>
  );
};


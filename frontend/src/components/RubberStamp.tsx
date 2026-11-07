import React from 'react';
import { motion } from 'framer-motion';

export type StampOutcome = 'POSTED' | 'REFUSED' | 'REPLAYED' | 'REVERSED';

interface RubberStampProps {
  outcome: StampOutcome;
  timestamp?: string;
  referenceId?: string | number;
  reason?: string;
  size?: 'sm' | 'md' | 'lg';
}

const STAMP_CONFIG: Record<
  StampOutcome,
  {
    border: string;
    color: string;
    bg: string;
    shadow: string;
    defaultRotation: number;
    title: string;
  }
> = {
  POSTED: {
    border: '3px solid #1E4E38',
    color: '#1E4E38',
    bg: 'rgba(30, 78, 56, 0.08)',
    shadow: '0 4px 12px rgba(30, 78, 56, 0.25)',
    defaultRotation: -3.5,
    title: 'POSTED',
  },
  REFUSED: {
    border: '3px solid #B33927',
    color: '#B33927',
    bg: 'rgba(179, 57, 39, 0.08)',
    shadow: '0 4px 12px rgba(179, 57, 39, 0.25)',
    defaultRotation: 5.2,
    title: 'REFUSED',
  },
  REPLAYED: {
    border: '3px solid #4A5568',
    color: '#4A5568',
    bg: 'rgba(74, 85, 104, 0.08)',
    shadow: '0 4px 12px rgba(74, 85, 104, 0.2)',
    defaultRotation: -1.2,
    title: 'REPLAYED',
  },
  REVERSED: {
    border: '3px solid #9A5B13',
    color: '#9A5B13',
    bg: 'rgba(154, 91, 19, 0.08)',
    shadow: '0 4px 12px rgba(154, 91, 19, 0.25)',
    defaultRotation: 2.8,
    title: 'REVERSED',
  },
};

export const RubberStamp: React.FC<RubberStampProps> = ({
  outcome,
  timestamp,
  referenceId,
  reason,
  size = 'md',
}) => {
  const config = STAMP_CONFIG[outcome] || STAMP_CONFIG.POSTED;

  const fontSizes = {
    sm: { title: '0.85rem', sub: '0.65rem', pad: '0.35rem 0.65rem' },
    md: { title: '1.25rem', sub: '0.72rem', pad: '0.6rem 1.25rem' },
    lg: { title: '1.75rem', sub: '0.8rem', pad: '0.85rem 1.75rem' },
  }[size];

  return (
    <motion.div
      initial={{ scale: 2.2, opacity: 0, rotate: config.defaultRotation * 2 }}
      animate={{ scale: 1, opacity: 1, rotate: config.defaultRotation }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 22,
        mass: 0.8,
      }}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: fontSizes.pad,
        border: config.border,
        borderRadius: '3px',
        color: config.color,
        backgroundColor: config.bg,
        boxShadow: config.shadow,
        userSelect: 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        fontFamily: 'var(--font-mono)',
        position: 'relative',
        maskImage:
          'radial-gradient(circle at 50% 50%, black 75%, rgba(0,0,0,0.85) 100%)',
      }}
    >
      {/* Decorative dashed inner border like an ink stamp seal */}
      <div
        style={{
          border: `1px dashed ${config.color}`,
          position: 'absolute',
          inset: '3px',
          pointerEvents: 'none',
          opacity: 0.7,
        }}
      />

      <span
        style={{
          fontWeight: 900,
          fontSize: fontSizes.title,
          lineHeight: 1.1,
          textShadow: '0 0 1px currentColor',
        }}
      >
        {config.title}
      </span>

      {(timestamp || referenceId) && (
        <span
          style={{
            fontSize: fontSizes.sub,
            marginTop: '0.2rem',
            opacity: 0.9,
            fontWeight: 600,
          }}
        >
          {referenceId ? `#${referenceId}` : ''} {timestamp || ''}
        </span>
      )}

      {reason && (
        <span
          style={{
            fontSize: '0.65rem',
            marginTop: '0.15rem',
            maxWidth: '180px',
            textAlign: 'center',
            textTransform: 'none',
            letterSpacing: 'normal',
            fontWeight: 500,
          }}
        >
          {reason}
        </span>
      )}
    </motion.div>
  );
};

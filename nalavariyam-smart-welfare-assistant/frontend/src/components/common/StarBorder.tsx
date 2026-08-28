import type { ElementType, ReactNode } from 'react';
import './StarBorder.css';

interface StarBorderProps {
  as?: ElementType;
  className?: string;
  color?: string;
  speed?: string;
  thickness?: number;
  children: ReactNode;
}

const StarBorder = ({
  as: Component = 'div',
  className = '',
  color = '#3b82f6',
  speed = '5s',
  thickness = 1,
  children,
  ...rest
}: StarBorderProps) => {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        padding: `${thickness}px 0`,
        ...((rest as Record<string, unknown>).style as React.CSSProperties || {}),
      }}
      {...rest}
    >
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      />
      <div className="inner-content">{children}</div>
    </Component>
  );
};

export default StarBorder;

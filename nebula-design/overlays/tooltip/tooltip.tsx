import React, { useState, useRef, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import type { TooltipPosition } from './tooltip-position-type.js';
import styles from './tooltip.module.scss';

/**
 * Props for the Tooltip component.
 */
export type TooltipProps = {
  /**
   * The content that triggers the tooltip on hover or focus.
   * This is the element the user will interact with.
   */
  children: React.ReactNode;
  /**
   * The content to be displayed inside the tooltip.
   * This can be a simple string or complex React nodes.
   */
  content: React.ReactNode;
  /**
   * Position of the tooltip relative to the trigger element.
   * Determines where the tooltip will appear.
   * @default 'top'
   */
  position?: TooltipPosition;
  /**
   * Optional external class name for the main tooltip wrapper element.
   * Allows for custom styling of the container.
   */
  className?: string;
  /**
   * Optional external class name for the tooltip content element itself.
   * Allows for custom styling of the tooltip popup.
   */
  tooltipClassName?: string;
  /**
   * Optional inline styles for the main tooltip wrapper element.
   * Use sparingly; prefer `className` for styling.
   */
  style?: React.CSSProperties;
  /**
   * Delay in milliseconds before the tooltip appears on hover/focus.
   * @default 0
   */
  enterDelay?: number;
  /**
   * Delay in milliseconds before the tooltip disappears on mouse leave / blur.
   * @default 0
   */
  leaveDelay?: number;
};

/**
 * Tooltip component displays a message when a user hovers over or focuses on an element.
 * It's designed to be unobtrusive and provide contextual information, styled according to the Nebula theme.
 */
export const Tooltip = ({
  children,
  content,
  position = 'top',
  className,
  tooltipClassName,
  style,
  enterDelay = 0,
  leaveDelay = 0,
}: TooltipProps): React.JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const showTooltip = useCallback(() => {
    clearTimers();
    if (enterDelay > 0) {
      enterTimerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, enterDelay);
    } else {
      setIsVisible(true);
    }
  }, [enterDelay, clearTimers]);

  const hideTooltip = useCallback(() => {
    clearTimers();
    if (leaveDelay > 0) {
      leaveTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, leaveDelay);
    } else {
      setIsVisible(false);
    }
  }, [leaveDelay, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers(); // Cleanup timers on unmount
    };
  }, [clearTimers]);

  // Basic positioning update - can be enhanced with a library for complex scenarios
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      // More sophisticated positioning logic could be added here if needed,
      // e.g., handling viewport collision.
      // The current CSS handles most common cases.
    }
  }, [isVisible, position]);

  const handleMouseEnter = showTooltip;
  const handleMouseLeave = hideTooltip;
  const handleFocus = showTooltip;
  const handleBlur = hideTooltip;

  return (
    <div
      ref={triggerRef}
      className={classNames(styles.tooltipWrapper, className)}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // tabIndex is needed if the children are not inherently focusable (e.g. a span)
      // Consider if children are focusable, then this might not be needed or conditionally added.
      // For robust accessibility, the trigger element should be focusable.
      // If children is a button or link, it's focusable. If it's a div/span, it might need tabIndex={0}.
    >
      {children}
      <div
        ref={tooltipRef}
        className={classNames(
          styles.tooltipContent,
          styles[position],
          { [styles.visible]: isVisible },
          tooltipClassName
        )}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        {content}
        <div className={styles.tooltipArrow} />
      </div>
    </div>
  );
};
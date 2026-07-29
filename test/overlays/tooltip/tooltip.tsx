import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';
import styles from './tooltip.module.scss';

/**
 * Defines the possible positions for the tooltip relative to its trigger element.
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

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
 * It's designed to be unobtrusive and provide contextual information.
 */
export function Tooltip({
  children,
  content,
  position = 'top',
  className,
  tooltipClassName,
  style,
  enterDelay = 0,
  leaveDelay = 0,
}: TooltipProps): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (enterDelay > 0) {
      enterTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, enterDelay);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveDelay > 0) {
      leaveTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, leaveDelay);
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    // Cleanup timeouts on component unmount
    return () => {
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current);
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const wrapperClass = classNames(styles.tooltipWrapper, className);
  const contentClass = classNames(
    styles.tooltipContent,
    styles[position], // Applies position-specific styles like .top, .bottom
    { [styles.visible]: isVisible },
    tooltipClassName
  );

  // Determine if the children might need a tabIndex to be focusable
  const isFocusableChild = React.isValidElement(children) &&
    typeof children.type === 'function' && // React components
    ((children.props as any).tabIndex !== undefined || (children.props as any).onClick !== undefined); // Heuristic for interactive components

  const needsTabIndex = !isFocusableChild && !(
    React.isValidElement(children) &&
    typeof children.type === 'string' &&
    ['button', 'a', 'input', 'select', 'textarea'].includes(children.type.toLowerCase()) &&
    !(children.props as any).disabled
  );


  return (
    <div
      className={wrapperClass}
      style={style}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocusCapture={showTooltip} // Use capture phase for focus to catch focus on non-interactive child wrappers
      onBlurCapture={hideTooltip}  // Use capture phase for blur
      // Add tabIndex to the wrapper if children are not inherently focusable, to make the tooltip accessible via keyboard.
      // aria-describedby would be needed for full accessibility, linking this trigger to the tooltip content.
      tabIndex={needsTabIndex ? 0 : undefined}
      // When the wrapper itself receives focus (due to tabIndex), it should also show the tooltip.
      // No, onFocus/onBlur on the wrapper itself manage this.
    >
      {children}
      {content ? (
        <div
          className={contentClass}
          role="tooltip"
          // If isVisible is false, aria-hidden can be true.
          // However, visibility: hidden and opacity: 0 already hide it from AT.
          // aria-hidden={!isVisible}
        >
          {content}
          <div className={styles.tooltipArrow} data-testid="tooltip-arrow" />
        </div>
      ) : null}
    </div>
  );
}
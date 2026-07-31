import type { ReactNode } from 'react';

export type ToastProps = {
  /**
   * sets the component children.
   */
  children?: ReactNode;
};

export function Toast({ children }: ToastProps) {
  return (
    <div>
      {children}
    </div>
  );
}

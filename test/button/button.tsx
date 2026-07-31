import type { ReactNode } from 'react';

export type ButtonProps = {
  /**
   * sets the component children.
   */
  children?: ReactNode;
};

export function Button({ children }: ButtonProps) {
  return (
    <div>
      {children}
    </div>
  );
}

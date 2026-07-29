import React, { ReactNode } from 'react';

export type Component1Props = {
  /**
   * a node to be rendered in the special component.
   */
  children?: ReactNode;
};

export function Component1({ children }: Component1Props) {
  return (
    <div>
      {children}
    </div>
  );
}

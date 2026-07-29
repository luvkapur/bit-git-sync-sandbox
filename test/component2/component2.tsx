import React, { ReactNode } from 'react';

export type Component2Props = {
  /**
   * a node to be rendered in the special component.
   */
  children?: ReactNode;
};

export function Component2({ children }: Component2Props) {
  return (
    <div>
      {children}
    </div>
  );
}

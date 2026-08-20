import type { ReactNode } from 'react';
import { Table } from '@teambit/documenter.ui.table';

export type ToastProps = {
  /**
   * sets the component children.
   */
  children?: ReactNode;
  /**
   * rows rendered in the toast's detail table.
   */
  details?: Array<{ name: string; value: string }>;
};

/**
 * a toast whose detail view is rendered with a component from another scope
 * (@teambit/documenter.ui.table) - the cross-scope dependency this demo is about.
 */
export function Toast({ children, details = [] }: ToastProps) {
  return (
    <div>
      {children}
      {details.length > 0 && <Table headings={['name', 'value']} rows={details} />}
    </div>
  );
}

export const directPushProbe = 'released-straight-to-main';

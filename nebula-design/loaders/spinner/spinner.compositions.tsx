import React from 'react';
import { NebulaTheme } from '@luvktest/nebula-design.nebula-theme';
import { Spinner } from './spinner.js';
import styles from './spinner-compositions.module.scss';

const CompositionContainer = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className={styles.compositionContainer}>
    <h3 className={styles.compositionTitle}>{title}</h3>
    <div className={styles.spinnerWrapper}>
      {children}
    </div>
  </div>
);

export const DefaultSpinner = () => {
  return (
    <NebulaTheme>
      <div className={styles.pageContainer}>
        <CompositionContainer title="Default Spinner">
          <Spinner />
        </CompositionContainer>
      </div>
    </NebulaTheme>
  );
};

export const SizedSpinner = () => {
  return (
    <NebulaTheme>
      <div className={styles.pageContainer}>
        <CompositionContainer title="Sized Spinners">
          <Spinner size={16} thickness={2} />
          <Spinner size={32} thickness={4} />
          <Spinner size={48} thickness={5} />
        </CompositionContainer>
      </div>
    </NebulaTheme>
  );
};

export const ColoredSpinner = () => {
  return (
    <NebulaTheme>
      <div className={styles.pageContainer}>
        <CompositionContainer title="Colored Spinners">
          <Spinner color="var(--colors-status-positive-default)" trackColor="var(--colors-status-positive-subtle)" />
          <Spinner color="var(--colors-status-negative-default)" trackColor="var(--colors-status-negative-subtle)" />
          <Spinner color="#C48CFF" trackColor="rgba(196, 140, 255, 0.3)" />
        </CompositionContainer>
      </div>
    </NebulaTheme>
  );
};

export const SpinnerWithCustomizations = () => {
  return (
    <NebulaTheme>
      <div className={styles.pageContainer}>
        <CompositionContainer title="Spinner with Custom Class & Style">
          <Spinner
            size={60}
            thickness={6}
            color="var(--colors-secondary-default)"
            trackColor="rgba(120, 120, 120, 0.2)"
            className={styles.customSpinner}
            style={{ filter: 'drop-shadow(0 0 5px var(--colors-secondary-default))' }}
          />
        </CompositionContainer>
      </div>
    </NebulaTheme>
  );
};
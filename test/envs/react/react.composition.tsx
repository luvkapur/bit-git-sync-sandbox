import React from 'react';
import classNames from 'classnames';
import { Button as BaseButton, ButtonProps as BaseButtonProps } from '@teambit/base-react.buttons.button';
import styles from './button.module.scss';


export type ButtonProps = {
  /**
   * a text to be rendered in the Button.
   */
  children?: any;

  /**
   * use secondary style.
   */
  secondary?: boolean;

  /**
   * class name to inject
   */
  className?: string;
} & BaseButtonProps;

export function Button({ className, secondary, children, ...rest }: ButtonProps) {
  const secondaryClass = secondary ? styles.secondary : '';

  return (
    <BaseButton {...rest} className={classNames(styles.button, className, secondaryClass)}>
      {children}
    </BaseButton>
  );
}
export const BasicButton = () => (
  <Button>Get Started</Button>
);

export const SecondaryButton = () => {
  return <Button secondary>Watch video</Button>;
};

export const LinkButton = () => {
  return <Button href="http://twitter.com">Getting Started</Button>;
};
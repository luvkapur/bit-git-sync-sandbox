import React from 'react';
import {
  Link as BaseLink,
  type LinkProps as BaseLinkProps,
  useLocation as baseUseLocation,
  useParams as baseUseParams,
  useNavigate as baseUseNavigate,
  useSearchQuery as baseUseSearchQuery
} from '@luvktest/test.navigation.link';
import classNames from 'classnames';
import styles from './link.module.scss';

/**
 * Properties for the Link component.
 * These are identical to the LinkProps from the @luvktest/test.navigation.link package.
 */
export type LinkProps = BaseLinkProps;

/**
 * A styled Link component that wraps the core navigation Link from the @luvktest/test.navigation.link package.
 * This component applies Nebula theme specific styles for visual consistency.
 * It supports all features of the base Link, including internal (React Router) and external navigation.
 *
 * @param props The properties for the Link component, adhering to the LinkProps type.
 * @returns A React JSX Element representing the styled link.
 */
export const Link: React.FC<LinkProps> = ({ className, children, ...rest }) => {
  return (
    <BaseLink className={classNames(styles.link, className)} {...rest}>
      {children}
    </BaseLink>
  );
};

/**
 * Re-export of the useLocation hook from React Router, obtained via the @luvktest/test.navigation.link package.
 * This hook returns the current location object, which represents the current URL.
 * @returns The current location object.
 */
export const useLocation = baseUseLocation;

/**
 * Re-export of the useParams hook from React Router, obtained via the @luvktest/test.navigation.link package.
 * This hook returns an object of key/value pairs of URL parameters.
 * For example, if the route path is "/users/:id", useParams will return { id: "actualId" }.
 * @returns An object of key/value pairs of URL parameters.
 */
export const useParams = baseUseParams;

/**
 * Re-export of the useNavigate hook from React Router, obtained via the @luvktest/test.navigation.link package.
 * This hook returns a function that lets you navigate programmatically.
 * For example, navigate('/home') or navigate(-1) to go back.
 * @returns A function to navigate programmatically.
 */
export const useNavigate = baseUseNavigate;

/**
 * Re-export of the useSearchQuery custom hook, obtained via the @luvktest/test.navigation.link package.
 * This hook provides a convenient way to read and write search query parameters from the URL.
 * @returns A tuple containing the current search query parameters as an object, and a function to update them.
 */
export const useSearchQuery = baseUseSearchQuery;
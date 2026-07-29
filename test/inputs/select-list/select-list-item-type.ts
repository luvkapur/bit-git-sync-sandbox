/**
 * Defines the structure for an individual item in the SelectList.
 */
export type SelectListItemType = {
  /**
   * The actual value of the select list item. This value is used internally and returned on change.
   */
  value: string;
  /**
   * The display label for the select list item. This is what the user sees.
   */
  label: string;
  /**
   * Optional flag to disable a specific item, making it unselectable.
   * @default false
   */
  disabled?: boolean;
};
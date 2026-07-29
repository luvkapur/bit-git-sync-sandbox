/**
 * Defines the structure for an individual item in the SelectList.
 * Each item has a value for internal logic and a label for display.
 * Items can optionally be disabled.
 */
export type SelectListItemType = {
  /**
   * The unique internal value of the select list item.
   * This value is used when an item is selected and in managing component state.
   */
  value: string;
  /**
   * The human-readable text displayed to the user for this item.
   */
  label: string;
  /**
   * If true, this specific item will be unselectable and visually de-emphasized.
   * Defaults to false if not provided.
   */
  disabled?: boolean;
};
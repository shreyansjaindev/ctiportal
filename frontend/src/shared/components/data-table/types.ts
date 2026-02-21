import type { JSX } from "react";

/** Represents a single option for filters */
export type Option = {
  label: string
  value: string | boolean | number | undefined;
}

export type Checkbox = {
  type: "checkbox";
  component?: (props: Option) => JSX.Element | null;
  options?: Option[];
};

export type Base<TData> = {
  label: string
  value: keyof TData
  /**
   * Defines if the accordion in the filter bar is open by default
   */
  defaultOpen?: boolean
  /**
   * Defines if the command input is disabled for this field
   */
  commandDisabled?: boolean
};

export type DataTableCheckboxFilterField<TData> = Base<TData> & Checkbox;

export type DataTableFilterField<TData> = DataTableCheckboxFilterField<TData>;

/** Legacy type for backwards compatibility */
export type FilterOption = {
  label: string
  value: string
}


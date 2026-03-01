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

export type Timerange = {
  type: "timerange";
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

export type DataTableTimerangeFilterField<TData> = Base<TData> & Timerange;

export type DataTableFilterField<TData> =
  | DataTableCheckboxFilterField<TData>
  | DataTableTimerangeFilterField<TData>;


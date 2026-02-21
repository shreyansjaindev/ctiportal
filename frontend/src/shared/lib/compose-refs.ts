import * as React from "react"

type PossibleRef<T> = React.Ref<T> | undefined

function setRef<T>(ref: PossibleRef<T>, value: T): void {
  if (typeof ref === "function") {
    ref(value)
  } else if (ref !== null && ref !== undefined) {
    ;(ref as React.MutableRefObject<T>).current = value
  }
}

/**
 * A utility to compose multiple refs together
 * Accepts multiple refs and returns a single ref callback
 */
export function composeRefs<T>(
  ...refs: PossibleRef<T>[]
): PossibleRef<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      setRef(ref, value)
    })
  }
}

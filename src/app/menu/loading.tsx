import type { ReactNode } from "react";

/**
 * Intentionally empty: a full-page BeevLoader on every tab switch felt like a
 * reload. Primary tabs stay alive in MenuTabKeepAlive; store pages paint instantly.
 */
export default function MenuLoading(): ReactNode {
  return null;
}

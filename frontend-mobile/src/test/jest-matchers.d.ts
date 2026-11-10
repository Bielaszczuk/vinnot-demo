import "@testing-library/react-native/extend-expect";
import type { JestNativeMatchers } from "@testing-library/react-native/extend-expect";

// Jest 30 declares `expect` matchers in the `expect` package; Testing Library still augments
// `@jest/expect` only, so `expect` imported from `@jest/globals` lacks its matchers without this.
declare module "expect" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void>, T = unknown> extends JestNativeMatchers<R> {}
}

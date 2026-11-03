import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/matchers";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";

expect.extend(matchers);
afterEach(() => cleanup());

// jsdom lacks <dialog> modal APIs: minimal polyfill so components using showModal() can be tested.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

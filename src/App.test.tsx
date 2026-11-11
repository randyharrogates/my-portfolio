import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App.tsx";
import { P } from "./site/data.ts";

beforeEach(() => {
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest
    .fn()
    .mockImplementation(() => ({
      matches: false,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.location.hash = "#/";
});
function visit(path: string) {
  window.location.hash = "#" + path;
  return render(<App />);
}
test("Home renders the approved headline", () => {
  visit("/");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "AI software engineer building AI-native products and multi-agent systems.",
  );
});
test("/work lists every case-study link and filters without scrolling", () => {
  visit("/work");
  expect(
    screen
      .getAllByRole("link")
      .filter((a) => a.textContent?.includes("Case study →")),
  ).toHaveLength(P.length);
  P.forEach((p) =>
    expect(
      document.querySelector(`a[href="#/work/${p.id}"]`),
    ).toBeInTheDocument(),
  );
  (window.scrollTo as jest.Mock).mockClear();
  fireEvent.click(screen.getByRole("button", { name: /AI-native products\s*4/ }));
  expect(window.location.hash).toBe("#/work?theme=products");
  expect(
    screen
      .getAllByRole("link")
      .filter((a) => a.textContent?.includes("Case study →")),
  ).toHaveLength(4);
  expect(window.scrollTo).not.toHaveBeenCalled();
});
test("/work/tide-tally renders Tide Tally and its four phone screenshots", () => {
  visit("/work/tide-tally");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Tide Tally",
  );
  expect(document.querySelectorAll(".cover.phones img")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Key decisions" }));
  expect(
    document.getElementById("c-decisions")?.scrollIntoView,
  ).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
});
test("/projects/kyb-pipeline redirects to the credit-memo case", () => {
  visit("/projects/kyb-pipeline");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "Credit memos in minutes, every figure cited",
  );
  expect(window.location.hash).toBe("#/work/credit-memo");
});
test("/skills redirects to About", () => {
  visit("/skills");
  expect(
    screen.getByRole("heading", { level: 1, name: "About" }),
  ).toBeInTheDocument();
  expect(window.location.hash).toBe("#/about");
});
test("unknown cases redirect to Work", () => {
  visit("/work/unknown");
  expect(
    screen.getByRole("heading", { level: 1, name: "Projects" }),
  ).toBeInTheDocument();
});
test("Ask supports keyboard selection, sourced answers, escape and focus return", () => {
  jest.useFakeTimers();
  visit("/");
  const ask = screen.getByRole("button", { name: /Ask about Randy/ });
  ask.focus();
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("textbox")).toHaveFocus();
  fireEvent.keyDown(document, { key: "ArrowDown" });
  fireEvent.keyDown(document, { key: "Enter" });
  expect(within(dialog).getByText(QAAnswer)).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  // Closing follows the prototype's 160 ms animation.
  act(() => {
    jest.runAllTimers();
  });
  expect(ask).toHaveFocus();
  jest.useRealTimers();
});
const QAAnswer = "Source: CV · TrustPlus AI · The Assembly Place";
test("theme toggle persists the selected theme", () => {
  visit("/");
  fireEvent.click(screen.getByRole("button", { name: "Switch theme" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("rc-theme")).toBe("dark");
});

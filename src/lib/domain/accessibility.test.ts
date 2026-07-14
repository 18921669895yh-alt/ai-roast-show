import { expect, it } from "vitest";

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const [bright, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (bright + .05) / (dark + .05);
}

it.each([
  ["ivory on ink", "#f5e8c8", "#10090f"],
  ["ivory on aubergine", "#f5e8c8", "#23101f"],
  ["signal on ink", "#f2c94c", "#10090f"],
  ["ink on signal", "#10090f", "#f2c94c"],
  ["white on accessible live red", "#ffffff", "#9f2119"],
])("keeps core token pair %s at WCAG AA normal-text contrast", (_label, foreground, background) => {
  expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
});

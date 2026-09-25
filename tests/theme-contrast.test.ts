import fs from 'node:fs';
import { expect, test } from 'vitest';

const css = fs.readFileSync('src/estilos/global.css', 'utf8');
function tokens(selector: string) {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6});/gi)].map((m) => [m[1], m[2]]));
}
function luminance(hex: string) {
  const c = hex.slice(1).match(/../g)!.map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
function ratio(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const dark = tokens(':root {');
const light = { ...dark, ...tokens(":root[data-theme='light'] {") };
for (const [theme, colors] of Object.entries({ dark, light })) {
  test(`${theme}: body, secondary text, placeholders and semantic states meet 4.5:1`, () => {
    for (const bg of ['bg', 'surface', 'surface-soft', 'surface-deep', 'surface-hover', 'surface-raised']) {
      for (const fg of ['text', 'muted', 'accent']) {
        expect(ratio(colors[fg], colors[bg]), `${theme} ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const fg of ['info', 'success', 'warning', 'danger', 'orange', 'purple', 'neutral']) {
      expect(ratio(colors[fg], colors[`${fg}-bg`]), `${theme} ${fg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(colors['button-text'], colors.gold)).toBeGreaterThanOrEqual(4.5);
  });
  test(`${theme}: field borders and keyboard focus meet 3:1 against form surfaces`, () => {
    for (const bg of ['bg', 'surface', 'surface-deep', 'surface-soft']) {
      expect(ratio(colors['control-line'], colors[bg]), `${theme} border/${bg}`).toBeGreaterThanOrEqual(3);
      expect(ratio(colors.focus, colors[bg]), `${theme} focus/${bg}`).toBeGreaterThanOrEqual(3);
    }
  });
}

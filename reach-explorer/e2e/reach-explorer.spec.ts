import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

/** Ground-truth figures from Excel via geo/build_reach_data.py */
const TOTAL = '2,293';
const ON_MAP = '1,911';
const PERIOD_CUMULATIVE = {
  week1: '184',
  week3: '1,669',
  final: '2,293',
};
const WEEK3_WEEKLY = '1,354';
const LAGOS_FINAL = '279';
const SOUTH_WEST_FINAL = '637';

const SCREENSHOT_DIR = join(process.cwd(), 'e2e-screenshots');

async function waitForAppReady(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OPay Scholars 2026' })).toBeVisible();
  await expect(page.getByTestId('accounting-total')).toHaveText(TOTAL);
  await expect(page.getByTestId('accounting-on-map')).toHaveText(ON_MAP);
  await expect(page.getByTestId('application-view-cumulative')).toHaveClass(/active/);
  await page.waitForTimeout(2500);
}

async function selectLayer(page: Page, layer: 'states' | 'zones' | 'schools') {
  const btn = page.getByTestId(`layer-${layer}`);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(btn).toHaveClass(/active/);
}

async function attachConsoleGuard(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

async function assertCanvasNonBlank(page: Page) {
  const canvas = page.locator('.map-container canvas').first();
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);

  const png = await canvas.screenshot();
  expect(png.length).toBeGreaterThan(4_000);
}

async function assertLayoutNoOverlap(page: Page) {
  const header = await page.locator('.app-header').boundingBox();
  const map = await page.locator('[data-testid="reach-map"]').boundingBox();
  const timeline = await page.locator('[data-testid="timeline"]').boundingBox();

  expect(header).toBeTruthy();
  expect(map).toBeTruthy();
  expect(timeline).toBeTruthy();

  expect(header!.y + header!.height).toBeLessThanOrEqual(map!.y + 2);
  expect(timeline!.y).toBeGreaterThanOrEqual(map!.y + map!.height - 2);
}

async function drillDownZone(page: Page) {
  await selectLayer(page, 'zones');
  const zoneButton = page.getByTestId('zone-rank-1');
  await expect(zoneButton).toContainText('South West');
  await zoneButton.click();
}

test.describe('Reach Explorer checklist', () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test('loads with Excel totals and no console errors', async ({ page }, testInfo) => {
    const errors = await attachConsoleGuard(page);
    await waitForAppReady(page);

    await assertCanvasNonBlank(page);
    await assertLayoutNoOverlap(page);

    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${testInfo.project.name}-loaded.png`),
      fullPage: true,
    });

    expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('layer switches: states, zones, schools', async ({ page }) => {
    await waitForAppReady(page);

    for (const layer of ['states', 'zones', 'schools'] as const) {
      await selectLayer(page, layer);
      await assertCanvasNonBlank(page);
    }
  });

  test('timeline scrub and play update counters', async ({ page }) => {
    await waitForAppReady(page);

    const counter = page.getByTestId('timeline-count');
    const slider = page.getByTestId('timeline-slider');

    await page.getByTestId('timeline-mode-cumulative').click();
    await slider.fill('0');
    await expect(counter).toContainText(PERIOD_CUMULATIVE.week1);

    await slider.fill('2');
    await expect(counter).toContainText(PERIOD_CUMULATIVE.week3);

    await slider.fill('5');
    await expect(counter).toContainText(PERIOD_CUMULATIVE.final);

    await page.getByTestId('timeline-mode-weekly').click();
    await slider.fill('2');
    await expect(counter).toContainText(WEEK3_WEEKLY);

    await slider.fill('0');
    const beforePlay = await counter.textContent();
    await page.getByTestId('timeline-play').click();
    await page.waitForTimeout(2000);
    const afterPlay = await counter.textContent();
    expect(afterPlay).not.toEqual(beforePlay);
  });

  test('hover tooltip and zone drill-down show expected values', async ({ page }) => {
    await waitForAppReady(page);
    await selectLayer(page, 'states');

    const map = page.locator('[data-testid="reach-map"]');
    const box = await map.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + box!.width * 0.35, box!.y + box!.height * 0.65);
    await page.waitForTimeout(800);

    const tooltip = page.getByTestId('map-tooltip');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toContainText(/cumulative/i);
    }

    await drillDownZone(page);
    const sidePanel = page.getByTestId('side-panel');
    await expect(sidePanel.getByRole('heading', { name: 'South West' })).toBeVisible();
    await expect(sidePanel).toContainText(SOUTH_WEST_FINAL);
    await expect(sidePanel).toContainText('Lagos');
  });

  test('acceptance scenarios: top state, top zone, Week 3 surge', async ({ page }) => {
    await waitForAppReady(page);

    const topState = page.getByTestId('state-rank-1');
    await expect(topState).toContainText('Lagos');
    await expect(topState).toContainText(LAGOS_FINAL);
    await topState.click();
    await expect(page.getByTestId('side-panel').getByRole('heading', { name: 'Lagos' })).toBeVisible();

    await selectLayer(page, 'zones');
    const topZone = page.getByTestId('zone-rank-1');
    await expect(topZone).toContainText('South West');
    await expect(topZone).toContainText(SOUTH_WEST_FINAL);
    await topZone.click();
    await expect(page.getByTestId('side-panel').getByRole('heading', { name: 'South West' })).toBeVisible();

    await page.getByTestId('timeline-mode-weekly').click();
    await page.getByTestId('timeline-slider').fill('2');
    await expect(page.getByTestId('timeline-count')).toContainText(WEEK3_WEEKLY);

    const periodSummary = await page.evaluate(async () => {
      const response = await fetch('/data/reach.json');
      const data = await response.json();
      return data.period_summary as { id: string; weekly: number }[];
    });
    const largestPeriod = [...periodSummary].sort((a, b) => b.weekly - a.weekly)[0];
    expect(largestPeriod).toEqual(expect.objectContaining({ id: 'Week3', weekly: 1354 }));
  });

  test('story mode shows beat captions', async ({ page }) => {
    await waitForAppReady(page);
    await page.getByRole('button', { name: 'Story' }).click();
    await expect(page.getByTestId('story-overlay')).toBeVisible();
    await expect(page.getByTestId('story-caption')).toContainText('2,293');
    await expect(page.getByTestId('story-step')).toContainText('1 / 7');
  });

  test('screenshot: canvas non-blank and controls layout', async ({ page }, testInfo) => {
    await waitForAppReady(page);
    await selectLayer(page, 'states');
    await page.getByTestId('timeline-slider').fill('2');

    await assertCanvasNonBlank(page);
    await assertLayoutNoOverlap(page);

    const shotPath = join(SCREENSHOT_DIR, `${testInfo.project.name}-week3.png`);
    await page.screenshot({ path: shotPath, fullPage: true });

    await testInfo.attach('viewport-screenshot', { path: shotPath, contentType: 'image/png' });
  });
});

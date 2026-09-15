import { expect, test, type Page } from '@playwright/test';

const anchors: Record<string, number> = {
  '3:2': 35, '3:3': 46, '3:4': 54, '3:5': 61, '3:6': 68,
  '2:1': 37, '2:1.5': 50, '2:2': 62, '2:3': 82, '2:4': 100,
};

async function onboard(page: Page, wrongFirst = false) {
  await page.goto('/');
  await page.getByRole('button', { name: /ENTER CALIBRATION/ }).click({ force: true });
  await page.getByRole('button', { name: wrongFirst ? '35%' : '54%' }).click({ force: true });
  await page.getByRole('button', { name: /COMMIT LINE/ }).click({ force: true });
  await expect(page.locator('.calibration-feedback')).toContainText(wrongFirst ? 'RUNWAY EXHAUSTED' : 'CONVERGENCE');
  await page.getByRole('button', { name: /CHANGE THE RUNWAY/ }).click({ force: true });
  await page.getByRole('button', { name: 'POT' }).click({ force: true });
  await page.getByRole('button', { name: /COMMIT LINE/ }).click({ force: true });
  await expect(page.locator('.calibration-feedback')).toContainText('CONVERGENCE');
  await page.getByRole('button', { name: /LOCK THE INSIGHT/ }).click({ force: true });
  await page.getByRole('button', { name: /POWER UP THE FORGE/ }).click({ force: true });
  await expect(page.locator('[data-screen="command"]')).toBeVisible();
  // Profile writes are intentionally coalesced for IndexedDB; cross the flush boundary before reload assertions.
  await page.waitForTimeout(250);
}

async function chooseConfidence(page: Page) {
  if (await page.locator('.confidence-control').isVisible().catch(() => false)) await page.getByRole('button', { name: 'MEDIUM' }).click({ force: true });
}

async function unlockIndependentAnchorRecall(page: Page) {
  await page.waitForTimeout(250);
  await page.evaluate(async () => {
    const key = 'geometry-reflex-forge:profile';
    const profile = JSON.parse(localStorage.getItem(key)!) as { concepts: Record<string, Record<string, unknown>> };
    for (const [id, concept] of Object.entries(profile.concepts)) {
      if (!id.startsWith('anchor:')) continue;
      Object.assign(concept, { scaffoldLevel: 0, mastery: 0.72, stability: 0.66, attempts: 8, successes: 7, failures: 1, independentSuccesses: 3, spacedSuccesses: 1 });
    }
    localStorage.setItem(key, JSON.stringify(profile));
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('geometry-reflex-forge', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('profiles', 'readwrite');
      transaction.objectStore('profiles').put(profile, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload();
  await expect(page.locator('[data-screen="command"]')).toBeVisible();
}

function anchorAnswer(prompt: string) {
  const match = prompt.match(/SPR\s+([\d.]+)\s+·\s+([23])/i);
  if (!match) throw new Error(`Cannot parse anchor prompt: ${prompt}`);
  return anchors[`${match[2]}:${match[1]}`]!;
}

async function answerCurrentAnchor(page: Page, correct = true) {
  const prompt = await page.locator('.challenge-copy h1').innerText();
  const target = anchorAnswer(prompt);
  const choiceButtons = page.locator('.answer-bank button');
  if (await choiceButtons.count()) {
    const labels = await choiceButtons.locator('strong').allTextContents();
    const chosen = correct ? labels.findIndex((label) => label.includes(String(target))) : labels.findIndex((label) => !label.includes(String(target)));
    await choiceButtons.nth(Math.max(0, chosen)).click({ force: true });
  } else {
    await page.locator('.numeric-entry input').fill(String(correct ? target : target > 50 ? target - 12 : target + 12));
  }
  await chooseConfidence(page);
  await page.getByRole('button', { name: /LOCK ANSWER/ }).click({ force: true });
}

test('first contact teaches the SPR 4 contrast and persists mastery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await onboard(page, true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.reload();
  await expect(page.locator('[data-screen="command"]')).toBeVisible();
  await expect(page.locator('.weak-signal')).toContainText(/anchor:3:4/i);
  expect(errors).toEqual([]);
});

test('retrieval, causal error feedback and root reconstruction all work', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await onboard(page);
  await page.getByRole('button', { name: 'Sectors' }).click();
  await page.locator('[data-mission="anchor-forge"]').click();
  await answerCurrentAnchor(page, true);
  await expect(page.getByTestId('feedback-panel')).toContainText('CONVERGENCE CONFIRMED');
  await page.getByRole('button', { name: /NEXT RETRIEVAL/ }).click({ force: true });
  await answerCurrentAnchor(page, false);
  await expect(page.getByTestId('feedback-panel')).toContainText(/RUNWAY EXHAUSTED|STACK EXHAUSTED EARLY/);
  await page.locator('.exit-control').click();

  await unlockIndependentAnchorRecall(page);
  await page.getByRole('button', { name: 'Sectors' }).click();
  await page.locator('[data-mission="anchor-forge"]').click();
  const recallPrompt = await page.locator('.challenge-copy h1').innerText();
  await expect(page.locator('.numeric-entry input')).toBeVisible();
  await page.locator('.numeric-entry input').fill(String(anchorAnswer(recallPrompt)));
  await chooseConfidence(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('feedback-panel')).toContainText('CONVERGENCE CONFIRMED');
  await page.locator('.exit-control').click();

  await page.getByRole('button', { name: 'Sectors' }).click();
  await page.locator('[data-mission="root-reactor"]').click();
  for (const operation of ['DOUBLE', '+1', 'ROOT', '−1', 'HALF']) await page.locator('.reactor-bank button', { hasText: operation }).click();
  await chooseConfidence(page);
  await page.getByRole('button', { name: /LOCK ANSWER/ }).click();
  await expect(page.getByTestId('feedback-panel')).toContainText('RETRIEVAL VERIFIED');
  await page.locator('.exit-control').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('Live Table accepts percent and BB as one timed geometric action', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await onboard(page);
  await page.getByRole('button', { name: 'Sectors' }).click();
  await page.locator('[data-mission="table-zero"]').click();
  await expect(page.getByTestId('table-read')).toBeVisible();
  const canvas = page.getByTestId('stackoff-3d').locator('canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * .4, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .65, box.y + box.height * .5, { steps: 5 });
    await page.mouse.up();
  }
  const pot = Number((await page.locator('.table-pot strong').innerText()).replace(/[^0-9.]/g, ''));
  const stack = Number((await page.locator('.table-seat--villain strong').innerText()).replace(/[^0-9.]/g, ''));
  const streets = (await page.locator('.street-badge').innerText()).includes('3 STREETS') ? 3 : 2;
  const expectedPercent = ((Math.pow(1 + 2 * stack / pot, 1 / streets) - 1) / 2) * 100;
  await expect(page.getByRole('button', { name: /% POT.*STRATEGY/i })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Bet size in percent of pot').fill(expectedPercent.toFixed(4));
  await chooseConfidence(page);
  await page.getByRole('button', { name: /DEPLOY BET/ }).click({ force: true });
  await expect(page.getByTestId('feedback-panel')).toContainText('CONVERGENCE CONFIRMED');
  await expect(page.getByTestId('live-table-feedback')).toContainText('% POT');
  await expect(page.getByTestId('live-table-feedback')).toContainText('BB');
  await expect(page.getByTestId('stackoff-schedule')).toContainText('HERO BET');
  await expect(page.getByTestId('stackoff-schedule')).toContainText('VILLAIN CALL');
  await expect(page.getByTestId('stackoff-street')).toHaveCount(streets);
  await page.getByRole('button', { name: /NEXT RETRIEVAL/ }).click({ force: true });

  const secondPot = Number((await page.locator('.table-pot strong').innerText()).replace(/[^0-9.]/g, ''));
  const secondStack = Number((await page.locator('.table-seat--villain strong').innerText()).replace(/[^0-9.]/g, ''));
  const secondStreets = (await page.locator('.street-badge').innerText()).includes('3 STREETS') ? 3 : 2;
  const secondPercent = ((Math.pow(1 + 2 * secondStack / secondPot, 1 / secondStreets) - 1) / 2) * 100;
  const secondBb = secondPot * secondPercent / 100;
  await chooseConfidence(page);
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^BB.*TABLE ACTION/i }).click();
  await page.getByLabel('Bet size in big blinds').fill(secondBb.toFixed(4));
  await page.getByRole('button', { name: /DEPLOY BET/ }).click({ force: true });
  await expect(page.getByTestId('feedback-panel')).toContainText('CONVERGENCE CONFIRMED');
  await expect(page.getByTestId('live-table-feedback')).toContainText('% POT');
  await expect(page.getByTestId('live-table-feedback')).toContainText('BB');
  await page.waitForTimeout(250);
  const latestTransferLatency = await page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('geometry-reflex-forge:profile')!) as { attempts: Array<{ questionType: string; responseTimeMs: number }> };
    return profile.attempts.filter((attempt) => attempt.questionType === 'transfer').at(-1)?.responseTimeMs ?? 0;
  });
  expect(latestTransferLatency).toBeGreaterThanOrEqual(800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('.exit-control').click();

  await page.getByRole('button', { name: /Learn/i }).click();
  await expect(page.locator('[data-screen="academy"]')).toBeVisible();
  await expect(page.locator('[data-screen="academy"]')).toContainText(/effective stack/i);
  await expect(page.locator('[data-screen="academy"]')).toContainText(/actual BB action/i);
  await expect(page.locator('[data-screen="academy"]')).toContainText(/square root/i);
  await expect(page.locator('[data-screen="academy"]')).toContainText(/cube root/i);
  await expect(page.locator('[data-screen="academy"]')).toContainText('(1 + 2b)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('Perfect Ten produces a verified personal record', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-1440', 'Personal-record path is covered at the primary mobile target.');
  await onboard(page);
  await page.getByRole('button', { name: /PERSONAL GHOST/ }).click();
  for (let index = 0; index < 10; index += 1) {
    await answerCurrentAnchor(page, true);
    await expect(page.getByTestId('feedback-panel')).toContainText('CONVERGENCE CONFIRMED');
    await page.getByRole('button', { name: /NEXT RETRIEVAL/ }).click({ force: true });
  }
  await expect(page.getByTestId('run-results')).toContainText('NEW PERSONAL RECORD');
  await expect(page.getByTestId('run-results')).toContainText('Perfect Ten');
});

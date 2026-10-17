import { expect, test } from '@playwright/test';

const CONTACT_COMMANDS = { es: './contacto.sh', en: './contact.sh' } as const;
const COMMANDS = { es: 'cat sobre-mi.md', en: 'cat about.md' } as const;

for (const locale of ['es', 'en'] as const) {
  const command = COMMANDS[locale];

  test.describe(`section motion /${locale}/`, () => {
    test('reduced motion shows the final state at once and never hides content', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      await page.locator('#about').scrollIntoViewIfNeeded();
      await expect(page.locator('html')).not.toHaveClass(/motion/);
      await expect(page.locator('#about [data-cmd-text]')).toHaveText(command);
      await expect(page.locator('#about [data-cmd-caret]')).toBeHidden();
      const opacities = await page
        .locator('[data-reveal-item]')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
      expect(opacities.length).toBeGreaterThan(0);
      expect(new Set(opacities)).toEqual(new Set(['1']));
    });

    test('without JavaScript every command and item is visible', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`/${locale}/`);
      await expect(page.locator('#about [data-cmd-text]')).toHaveText(command);
      for (const item of await page.locator('[data-reveal-item]').all()) {
        await expect(item).toHaveCSS('opacity', '1');
      }
      await context.close();
    });

    test('with motion allowed, a section types its command and then reveals its content once', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      // The first scroll starts the motion; sections still below the fold animate when reached.
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const contact = page.locator('#contact');
      await expect(contact).not.toHaveAttribute('data-revealed', '');
      await contact.scrollIntoViewIfNeeded();
      const typed = contact.locator('[data-cmd-text] [data-typed]');
      const first = contact.locator('[data-reveal-item]').first();
      // The content is the command's output: it stays hidden until the command is fully typed.
      await expect.poll(async () => (await typed.textContent())!.length).toBeGreaterThan(0);
      if ((await typed.textContent()) !== CONTACT_COMMANDS[locale]) {
        await expect(first).not.toHaveClass(/is-in/);
      }
      await expect(typed).toHaveText(CONTACT_COMMANDS[locale]);
      await expect(first).toHaveClass(/is-in/);
      await expect(first).toHaveCSS('opacity', '1');
      await expect(contact.locator('[data-cmd-caret]')).toHaveAttribute('data-done', '');
      // Runs once: the command is not retyped when the section is left and reached again.
      await page.evaluate(() => window.scrollTo(0, 0));
      await contact.scrollIntoViewIfNeeded();
      await expect(typed).toHaveText(CONTACT_COMMANDS[locale]);
    });

    test('items of a section arrive one after another, not together', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const items = page.locator('#contact [data-reveal-item]');
      expect(await items.count()).toBeGreaterThan(1);
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await expect(items.first()).toHaveClass(/is-in/);
      const settled = await items.evaluateAll((els) =>
        els.map((el) => parseFloat((el as HTMLElement).style.transitionDelay || '0')),
      );
      expect(new Set(settled).size).toBeGreaterThan(1);
      expect(settled).toEqual([...settled].sort((a, b) => a - b));
    });

    test('does not scroll horizontally', async ({ page }) => {
      await page.goto(`/${locale}/`);
      await page.locator('#contact').scrollIntoViewIfNeeded();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}

for (const locale of ['es', 'en'] as const) {
  test.describe(`experience rail /${locale}/`, () => {
    const nodes = '#experience [data-rail-node]';
    const lit = '#experience [data-rail-node].is-lit';

    test('reduced motion renders the rail full with every node lit', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      await page.locator('#experience').scrollIntoViewIfNeeded();
      const fill = await page.locator('#experience [data-rail-fill]').evaluate((el) => {
        const { height } = el.getBoundingClientRect();
        return { height, track: el.parentElement!.getBoundingClientRect().height };
      });
      expect(fill.height).toBeGreaterThan(0);
      expect(fill.height).toBeCloseTo(fill.track - 16, 0);
      const colors = await page
        .locator(nodes)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
      expect(colors.length).toBeGreaterThan(1);
      expect(new Set(colors)).toEqual(new Set(['rgb(61, 220, 151)']));
    });

    test('with motion the fill follows the scroll and lights the nodes it passes', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const total = await page.locator(nodes).count();
      expect(total).toBeGreaterThan(1);
      const rail = page.locator('#experience [data-rail]');
      await page.evaluate(() => window.scrollTo(0, 0));
      await rail.scrollIntoViewIfNeeded();
      const before = await page.locator(lit).count();
      expect(before).toBeLessThan(total);
      // Bring the end of the rail to the reading line: the fill is complete, every node lit.
      await rail.evaluate((el) => {
        const { bottom } = el.getBoundingClientRect();
        window.scrollBy(0, bottom - window.innerHeight * 0.5);
      });
      await expect(page.locator(lit)).toHaveCount(total);
      await expect
        .poll(() => rail.evaluate((el) => Number(el.style.getPropertyValue('--fill'))))
        .toBeCloseTo(1, 1);
    });
  });
}

for (const locale of ['es', 'en'] as const) {
  test.describe(`tech lead path /${locale}/`, () => {
    const nodes = '#path [data-path-node]';
    const pulse = (selector: string) =>
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? getComputedStyle(el, '::after').animationName : 'missing'; })()`;

    test('reduced motion shows the whole log: every row, the drawn graph, lit dots, no pulse', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      await page.locator('#path').scrollIntoViewIfNeeded();
      await expect(page.locator('#path [data-path-line]')).toHaveCSS('stroke-dashoffset', '0px');
      const rows = page.locator('#path [data-row]');
      const total = await rows.count();
      expect(total).toBeGreaterThan(1);
      for (const row of await rows.all()) {
        await expect(row).toHaveCSS('opacity', '1');
        await expect(row.locator('[data-row-body]')).toHaveCSS('opacity', '1');
        await expect(row.locator('.commit-hash')).toHaveText(/^[0-9a-f]{7}$/);
      }
      await expect(page.locator('#path .commit-ref')).toHaveText('(HEAD -> tech-lead)');
      const colors = await page
        .locator(nodes)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
      expect(colors.length).toBeGreaterThan(1);
      expect(new Set(colors)).toEqual(new Set(['rgb(61, 220, 151)']));
      expect(await page.evaluate(pulse('#path [data-current]'))).toBe('none');
    });

    test('with motion the commits appear one by one as the scroll reaches them', async ({
      page,
    }) => {
      await page.goto(`/${locale}/`);
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const rows = page.locator('#path [data-row]');
      const total = await rows.count();
      expect(total).toBeGreaterThan(2);
      const shown = () => page.locator('#path [data-row].is-in').count();
      // Enter the section: its command types first, then the first commits show.
      await page.evaluate(() => {
        const top = document.querySelector('#path [data-path]')!.getBoundingClientRect().top;
        window.scrollBy({
          top: top + window.scrollY - window.innerHeight * 0.5 - window.scrollY,
          behavior: 'instant',
        });
      });
      await expect.poll(shown, { timeout: 8000 }).toBeGreaterThan(0);
      // Partway in: later rows are still hidden (and not yet typed).
      expect(await shown()).toBeLessThan(total);
      await expect(rows.last()).toHaveCSS('opacity', '0');
      // Keep going to the end of the log: every commit appeared, the graph is closed, HEAD pulses.
      await page.evaluate(() => {
        const { bottom } = document.querySelector('#path [data-path]')!.getBoundingClientRect();
        window.scrollBy({ top: bottom - window.innerHeight * 0.4, behavior: 'instant' });
      });
      await expect.poll(shown, { timeout: 12000 }).toBe(total);
      await expect(page.locator(`${nodes}.is-lit`)).toHaveCount(await page.locator(nodes).count(), {
        timeout: 8000,
      });
      await expect(page.locator('#path [data-path-line]')).toHaveCSS('stroke-dashoffset', '0px', {
        timeout: 8000,
      });
      await expect(rows.last().locator('[data-row-body]')).toHaveClass(/is-in/, { timeout: 8000 });
      expect(await page.evaluate(pulse('#path [data-current]'))).toBe('stage-pulse');
      expect(await page.locator('#path [data-current]').count()).toBe(1);
    });
  });
}

for (const locale of ['es', 'en'] as const) {
  test.describe(`sticky heading /${locale}/`, () => {
    test('is sticky with a progress bar from 1024px, static without a bar below', async ({
      page,
    }, testInfo) => {
      await page.goto(`/${locale}/`);
      const head = page.locator('#experience [data-section-head]');
      const bar = page.locator('#experience [data-progress]');
      const desktop = testInfo.project.name === 'desktop';
      await expect(head).toHaveCSS('position', desktop ? 'sticky' : 'static');
      if (!desktop) {
        await expect(bar).toBeHidden();
        return;
      }
      // Reserved from the start, shown only once motion is confirmed by the first scroll.
      await expect(bar).toBeHidden();
      const reserved = await bar.evaluate((el) => el.getBoundingClientRect().height);
      expect(reserved).toBeGreaterThan(0);
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      await expect(bar).toBeVisible();
      expect((await bar.evaluate((el) => el.getBoundingClientRect().height)) - reserved).toBe(0);
    });

    test('the heading stays under the header while the section scrolls and the bar fills', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sticky columns are desktop only');
      await page.goto(`/${locale}/`);
      await page.mouse.wheel(0, 40);
      await expect(page.locator('html')).toHaveClass(/motion/);
      const section = page.locator('#experience');
      const head = section.locator('[data-section-head]');
      const progress = () =>
        section.evaluate((el) =>
          Number(
            el.querySelector<HTMLElement>('[data-progress]')!.style.getPropertyValue('--p') || 0,
          ),
        );
      const headerH = await page.evaluate(
        () => document.querySelector('header')!.getBoundingClientRect().height,
      );
      const box = await section.boundingBox();
      // Land a third of the way through the section.
      await page.evaluate(
        (y) => window.scrollTo({ top: y, behavior: 'instant' }),
        box!.y + box!.height * 0.35 - 100 + (await page.evaluate(() => window.scrollY)),
      );
      await expect.poll(progress).toBeGreaterThan(0);
      expect(await progress()).toBeLessThan(1);
      const top = (await head.boundingBox())!.y;
      expect(top).toBeGreaterThanOrEqual(headerH - 1);
      expect(top).toBeLessThanOrEqual(headerH + 40);
      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }),
      );
      await expect.poll(progress).toBeCloseTo(1, 1);
    });

    test('reduced motion keeps the sticky heading and never shows the bar', async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sticky columns are desktop only');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${locale}/`);
      await page.locator('#experience').scrollIntoViewIfNeeded();
      await expect(page.locator('#experience [data-section-head]')).toHaveCSS('position', 'sticky');
      await expect(page.locator('#experience [data-progress]')).toBeHidden();
    });
  });
}

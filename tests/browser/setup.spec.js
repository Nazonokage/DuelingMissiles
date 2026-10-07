import { test, expect } from '@playwright/test';

test('welcome dialogs preserve settings, restore focus and pause ambient motion',async({page},info)=>{
 await page.goto('/');
 await page.screenshot({path:`test-results/${info.project.name}-welcome.png`});
 await expect(page.locator('#go')).toBeHidden();
 await expect(page.locator('#anonymous-name')).toBeHidden();
 await page.locator('#offline-mode').click();
 await expect(page.locator('#play-dialog')).toBeVisible();
 await expect(page.locator('body')).toHaveClass(/welcome-resting/);
 await expect(page.locator('.flight-line')).toHaveCSS('animation-play-state','paused');
 await page.locator('#setup summary').click();
 await expect(page.locator('#wobble')).not.toBeChecked();
 await page.locator('[data-k=n][data-v="7"]').click();
 await page.keyboard.press('Escape');
 await expect(page.locator('#play-dialog')).toBeHidden();
 await expect(page.locator('#offline-mode')).toBeFocused();
 await page.locator('#offline-mode').click();
 await expect(page.locator('[data-k=n][data-v="7"]')).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('#play-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#modal-close').click();
 await page.locator('#online-mode').click();
 await expect(page.locator('#anonymous-name')).toBeFocused();
 await page.locator('#create-name').click();
 await page.locator('#host-match').click();
 await expect(page.locator('#settings-title')).toHaveText('Set the ground rules.');
 await page.locator('#go').click();
 await expect(page.locator('#hosting-room')).toBeVisible();
 await page.locator('#modal-close').click();
 await page.locator('#offline-mode').click();
 await expect(page.locator('#go')).toBeEnabled();
 await page.locator('#go').click();
 await expect(page.locator('#setup')).toBeHidden();
});

test('pre-flight settings are readable, scrollable and preserve all match options',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('#offline-mode').click();await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.fonts.check('24px "Black Ops One"'))).toBe(true);
 await expect(page.locator('#game-title')).toBeVisible();
 expect(await page.locator('#setup').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:`test-results/${info.project.name}-setup.png`});
 await page.locator('[data-k=n][data-v="7"]').click();
 await expect(page.locator('[data-k=n][data-v="7"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-k=n][data-v="5"]')).toHaveAttribute('aria-pressed','false');
 await page.locator('[data-k=hp][data-v="3"]').click();
 await page.locator('[data-k=theme][data-v=night]').click();
 await page.locator('#p1country').selectOption('finland');await page.locator('#p2country').selectOption('japan');
 await page.locator('#music-volume').fill('0.65');await expect(page.locator('#volume-value')).toHaveText('65%');
 await page.locator('#setup summary').click();
 for(const id of ['reduced-motion','particles','shake','sfx','color-safe','cosmetics']){
  const input=page.locator('#'+id);await input.scrollIntoViewIfNeeded();await expect(input).toBeVisible();
 }
 await page.locator('#quality').selectOption('low');await page.locator('#seed').fill('123');
 await page.locator('#go').scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/${info.project.name}-setup-options.png`});
 expect(await page.locator('#setup').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.locator('#go').click();await expect(page.locator('#setup')).toBeHidden();
 await expect(page.locator('#chips button')).toHaveCount(7);expect(errors).toEqual([]);
});

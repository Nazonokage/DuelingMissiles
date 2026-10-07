import { test,expect } from '@playwright/test';

test('anonymous players search, request approval and play synchronized turns',async({page,context},info)=>{
 const guest=await context.newPage(),errors=[],snapshots=[[],[]],matchConfigs=[];
 for(const [index,p] of [page,guest].entries()){
  p.on('pageerror',e=>errors.push(e.message));
  p.on('websocket',ws=>ws.on('framereceived',frame=>{try{const m=JSON.parse(frame.payload);if(m.type==='snapshot')snapshots[index].push(m.snapshot);if(m.type==='match')matchConfigs[index]=m.config;}catch{}}));
  await p.goto('/');await p.locator('#online-mode').click();
 }
 const suffix=String(Date.now()).slice(-6),hostName='Host-'+suffix,guestName='Guest-'+suffix;
 await expect(page.locator('[data-k=theme][data-v=blueprint]')).toHaveAttribute('aria-pressed','true');
 for(const [p,name] of [[page,hostName],[guest,guestName]]){
  await expect(p.locator('#anonymous-name')).toHaveValue(/^[A-Za-z]+-\d{4}$/);
  await p.locator('#anonymous-name').fill(name);await p.locator('#create-name').click();
  await expect(p.locator('#lobby-actions')).toBeVisible();
 }
 await page.locator('#host-match').click();await page.locator('#setup summary').click();await page.locator('#wobble').uncheck();
 await page.locator('#go').click();await expect(page.locator('#hosting-room')).toBeVisible();
 await expect(page.locator('#lobby-loader')).toBeVisible();
 await page.screenshot({path:`test-results/${info.project.name}-waiting-cubes.png`});
 await guest.locator('#search-matches').click();await guest.locator('#player-search').fill(hostName);
 const request=guest.locator('.room-row').filter({hasText:hostName}).getByRole('button',{name:'Request match'});
 await request.click();await expect(guest.locator('#lobby-status')).toContainText('Waiting for '+hostName);
 await expect(guest.locator('#lobby-loader')).toBeVisible();
 await expect(page.locator('#join-requests')).toContainText(guestName);
 await expect(page.locator('#lobby-loader')).toBeHidden();
 await expect(guest.locator('#setup')).toBeVisible();await expect(page.locator('#setup')).toBeVisible();
 await page.locator('#join-requests').getByRole('button',{name:'Decline'}).click();
 await expect(guest.locator('#lobby-status')).toContainText('declined');
 await guest.locator('#search-matches').click();await request.click();
 await page.locator('#join-requests').scrollIntoViewIfNeeded();await page.screenshot({path:`test-results/${info.project.name}-host-approval.png`});
 await page.locator('#join-requests').getByRole('button',{name:'Accept',exact:true}).click();
 await expect(page.locator('#setup')).toBeHidden();await expect(guest.locator('#setup')).toBeHidden();
 expect(matchConfigs.map(c=>c.wobble)).toEqual([false,false]);
 await expect(page.locator('#online-status')).toContainText('Your turn');await expect(guest.locator('#online-status')).toContainText(hostName+'’s turn');
 await expect.poll(()=>snapshots[0].at(-1)?.state).toBe('aiming');
 await guest.keyboard.press('Space');expect(snapshots[1].at(-1).ball).toBeNull();
 await page.keyboard.down('Space');await page.waitForTimeout(300);await page.keyboard.up('Space');
 await expect.poll(()=>snapshots[0].at(-1)?.state).toBe('flying');
 await expect.poll(()=>snapshots[1].at(-1)?.state).toBe('flying');
 await expect(guest.locator('#online-status')).toContainText('Your turn',{timeout:15000});
 await expect.poll(()=>snapshots[1].at(-1)?.state).toBe('aiming');
 await guest.keyboard.down('Space');await guest.waitForTimeout(300);await guest.keyboard.up('Space');
 await expect(page.locator('#online-status')).toContainText('Your turn',{timeout:15000});
 await expect.poll(()=>snapshots[0].at(-1)?.state).toBe('aiming');
 const shared=snapshots[0].findLast(s=>snapshots[1].some(other=>other.tick===s.tick));
 expect(shared).toBeTruthy();expect(snapshots[1].find(s=>s.tick===shared.tick)).toEqual(shared);
 await page.keyboard.press('m');await page.keyboard.press('Space');
 await expect.poll(()=>snapshots[0].at(-1)?.state).toBe('control');
 await page.keyboard.press('Space');await expect.poll(()=>snapshots[0].at(-1)?.ball?.armed).toBe(true);
 await page.keyboard.press('Space');await expect.poll(()=>snapshots[0].at(-1)?.ball?.boosted).toBe(true);
 await page.screenshot({path:`test-results/${info.project.name}-online-duel.png`});
 await guest.locator('#leave-online').click();await expect(page.locator('#endt')).toContainText('left the match');expect(errors).toEqual([]);
});

test('names are required and the lobby does not accept invalid display names',async({page})=>{
 await page.goto('/');await page.locator('#online-mode').click();await page.locator('#anonymous-name').fill('');await page.locator('#create-name').click();
 await expect(page.locator('#lobby-status')).toContainText('3–20');await expect(page.locator('#lobby-actions')).toBeHidden();
 await page.locator('#random-name').click();await expect(page.locator('#anonymous-name')).toHaveValue(/^[A-Za-z]+-\d{4}$/);
});

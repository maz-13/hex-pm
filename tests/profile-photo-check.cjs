const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'America/Los_Angeles'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.request.post('http://127.0.0.1:4178/__reset');
  await page.goto('http://127.0.0.1:4178');
  await page.locator('.ni').filter({hasText:'Team'}).click();
  await page.locator('.tc').filter({hasText:'Alex Morgan'}).click();
  await page.locator('#mp-edit-btn').click();

  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR42mP8z8AARMAgYGRk+A8ABQAB/4z2WQAAAABJRU5ErkJggg==','base64');
  await page.evaluate(pngBytes => {
    const bytes = Uint8Array.from(atob(pngBytes), c => c.charCodeAt(0));
    const file = new File([bytes], 'clipboard.png', {type:'image/png'});
    const clipboardData = new DataTransfer();
    clipboardData.items.add(file);
    document.dispatchEvent(new ClipboardEvent('paste', {clipboardData, bubbles:true, cancelable:true}));
  }, png.toString('base64'));
  await page.waitForFunction(()=>document.querySelector('#mp-av-preview img')?.src.startsWith('data:image/jpeg;base64,'));
  assert.equal(await page.locator('#mp-av-preview img').count(),1);
  await page.locator('#mp-edit-footer').getByRole('button',{name:'Save',exact:true}).click();
  assert.equal(await page.locator('#mp-header-avatar img').count(),1);
  await page.locator('#member-panel .btn-close').click();
  assert.equal(await page.locator('.tc').filter({hasText:'Alex Morgan'}).locator('.tc-av img').count(),1);
  await page.screenshot({animations:'disabled',path:'/private/tmp/hex-team-profile-photo.png'});

  await page.locator('.ni').filter({hasText:'Assignments'}).click();
  assert.equal(await page.locator('[data-member="alex"] .person-avatar img').count(),1);
  await page.reload();
  await page.locator('.ni').filter({hasText:'Team'}).click();
  assert.equal(await page.locator('.tc').filter({hasText:'Alex Morgan'}).locator('.tc-av img').count(),1);

  await page.locator('.tc').filter({hasText:'Alex Morgan'}).click();
  await page.locator('#mp-edit-btn').click();
  await page.locator('#mp-photo-remove').click();
  assert.equal(await page.locator('#mp-av-preview img').count(),0);
  assert.match(await page.locator('#mp-av-preview').innerText(),/AM/);
  await page.locator('#mp-edit-footer').getByRole('button',{name:'Save',exact:true}).click();
  await page.locator('#member-panel .btn-close').click();
  assert.equal(await page.locator('.tc').filter({hasText:'Alex Morgan'}).locator('.tc-av img').count(),0);
  assert.match(await page.locator('.tc').filter({hasText:'Alex Morgan'}).locator('.tc-av').innerText(),/AM/);
  assert.deepEqual(errors,[]);
  await page.request.post('http://127.0.0.1:4178/__reset');
  await browser.close();
  console.log('Profile photos passed: clipboard paste, optimized preview, save, Team, Assignments, reload, remove, initials fallback.');
})().catch(error=>{console.error(error);process.exit(1);});

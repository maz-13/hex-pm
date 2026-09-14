const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));

 await page.request.post('http://127.0.0.1:4178/__reset?small=1');
 await page.goto('http://127.0.0.1:4178');
 await page.locator('.tr').filter({hasText:'Acme Studio'}).click();
 await page.locator('#cp-rename-btn').click();
 await page.locator('#cp-name').fill('Acme Rebrand');
 await page.locator('#cp-name').press('Enter');
 assert.equal(await page.locator('#cp-name').inputValue(),'Acme Rebrand');
 assert.equal(await page.locator('#cp-rename-btn').innerText(),'Rename');
 await page.locator('#client-panel .btn-close').click();
 assert.match(await page.locator('#proj-tbl-body').innerText(),/Acme Rebrand/);

 await page.locator('.ni').filter({hasText:'Assignments'}).click();
 assert.match(await page.locator('#assignment-tasks').innerText(),/Acme Rebrand/);
 await page.reload();
 await page.locator('.ni').filter({hasText:'Assignments'}).click();
 assert.match(await page.locator('#assignment-tasks').innerText(),/Acme Rebrand/);

 await page.getByRole('button',{name:'Timeline',exact:true}).click();
 await page.locator('.tl-name-row').filter({hasText:'Acme Rebrand'}).click();
 await page.locator('#pp-rename-btn').click();
 await page.locator('#pp-name').fill('Acme Launch');
 await page.locator('#pp-name').press('Escape');
 assert.equal(await page.locator('#pp-name').inputValue(),'Acme Rebrand');
 await page.locator('#pp-rename-btn').click();
 await page.locator('#pp-name').fill('Acme Launch');
 await page.locator('#pp-rename-btn').click();
 assert.equal(await page.locator('#pp-name').inputValue(),'Acme Launch');
 await page.locator('#proj-panel .btn-close').click();
 assert.match(await page.locator('#tl-names-body').innerText(),/Acme Launch/);
 assert.deepEqual(errors,[]);
 await page.request.post('http://127.0.0.1:4178/__reset');
 await browser.close();
 console.log('Rename passed: client panel, project panel, cancel, save, reload, assignments, timeline.');
})().catch(e=>{console.error(e);process.exit(1);});

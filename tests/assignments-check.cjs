const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.request.post('http://127.0.0.1:4178/__reset');
 await page.goto('http://127.0.0.1:4178/#assignments');
 await page.locator('#v-assignments').waitFor({state:'visible'});
 assert.equal(await page.locator('.workload-person').count(),10);
 assert.equal(await page.locator('#assignment-tasks .assignment-task').count(),5);
 assert.match(await page.locator('#assignment-summary').innerText(),/15 active projects/);
 assert.match(await page.locator('#assignment-context').innerText(),/Moodboarding.*Atlas/s);
 assert.match(await page.locator('.workload-person').first().innerText(),/Zoe Kim/);
 assert.match(await page.locator('[data-member="alex"]').innerText(),/3 active/);
 assert.match(await page.locator('[data-member="alex"]').innerText(),/Arc.*Cedar.*Fieldwork/s);
 await page.screenshot({animations:'disabled',path:'/private/tmp/hex-assignments-redesign.png'});
 // Staffing is explicit: two people can be assigned while more help is needed.
 assert.equal(await page.locator('#assignment-context').getByRole('switch',{name:'Fully staffed'}).isDisabled(),true);
 await page.locator('[data-member="zoe"] .assign-action').click();
 await page.locator('[data-member="maya"] .assign-action').click();
 assert.match(await page.locator('#assignment-summary').innerText(),/5 current tasks need staffing/);
 assert.match(await page.locator('.staffing-help').innerText(),/2 assigned.*Still needs people/);
 await page.locator('#assignment-context').getByRole('switch',{name:'Fully staffed'}).check();
 assert.match(await page.locator('#assignment-summary').innerText(),/4 current tasks need staffing/);
 await page.reload();await page.locator('#v-assignments').waitFor({state:'visible'});
 await page.locator('#queue-current').click();
 await page.locator('#assignment-tasks .assignment-task').filter({hasText:'Atlas'}).click();
 assert.equal(await page.locator('#assignment-context').getByRole('switch',{name:'Fully staffed'}).isChecked(),true);
 // Removing one person reopens staffing even if someone else remains. Undo restores both.
 await page.locator('[data-member="maya"] .assign-action').click();
 assert.match(await page.locator('.staffing-help').innerText(),/1 assigned.*Still needs people/);
 assert.match(await page.locator('#assignment-summary').innerText(),/5 current tasks need staffing/);
 await page.locator('#assignment-feedback').getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await page.locator('#assignment-context').getByRole('switch',{name:'Fully staffed'}).isChecked(),true);
 assert.match(await page.locator('.staffing-help').innerText(),/2 assigned.*Team complete/);
 await page.locator('#assignment-detail').click();
 assert.equal(await page.locator('#dp-staffing').getByRole('switch',{name:'Fully staffed'}).isChecked(),true);
 await page.locator('#dp-staffing').getByRole('switch',{name:'Fully staffed'}).uncheck();
 await page.locator('#del-panel .btn-close').click();
 assert.equal(await page.locator('#assignment-context').getByRole('switch',{name:'Fully staffed'}).isChecked(),false);
 // Skill sorting changes with the selected task, without hiding anyone.
 await page.locator('#assignment-tasks .assignment-task').filter({hasText:'Kinfolk'}).click();
 assert.match(await page.locator('.workload-person').first().innerText(),/Kai Santos/);
 await page.locator('[data-member="kai"] .assign-action').click();
 await page.reload();await page.locator('#v-assignments').waitFor({state:'visible'});
 await page.locator('#queue-current').click();
 assert.equal(await page.locator('#assignment-tasks .assignment-task').count(),15);
 await page.locator('#assignment-tasks .assignment-task').filter({hasText:'Kinfolk'}).click();
 assert.equal(await page.locator('[data-member="kai"] .assign-action').innerText(),'Remove');
 await page.locator('[data-member="kai"] .assign-action').click();
 assert.equal(await page.locator('[data-member="kai"] .assign-action').innerText(),'Assign');
 // Workload project links choose the correct task; task details still open.
 await page.locator('[data-member="alex"] .workload-projects').getByRole('button',{name:'Cedar · Brand dev',exact:true}).click();
 assert.match(await page.locator('#assignment-context').innerText(),/Brand Development.*Cedar/s);
 await page.locator('#assignment-detail').click();
 assert.match(await page.locator('#dp-title').innerText(),/Brand Development/);
 await page.locator('#del-panel .btn-close').click();
 // Plan ahead is collapsed by default, and retains all team comparisons.
 assert.equal(await page.locator('#assignment-upcoming').getAttribute('open'),null);
 await page.locator('#upcoming-label').click();
 await page.locator('#upcoming-tasks .assignment-task').first().click();
 assert.equal(await page.locator('.workload-person').count(),10);
 // Smaller desktop layout remains readable without page overflow.
 await page.setViewportSize({width:1280,height:900});
 await page.screenshot({animations:'disabled',path:'/private/tmp/hex-assignments-1280.png'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 await page.request.post('http://127.0.0.1:4178/__reset');
 await browser.close();console.log('Assignments passed: multi-person staffing, explicit completion, removal/undo, detail toggle, 15 projects, 10 people, queue, matches, workload, assign/remove/undo, persistence, task details, upcoming, layout.');
})().catch(e=>{console.error(e);process.exit(1);});

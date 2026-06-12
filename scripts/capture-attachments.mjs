import { chromium } from 'playwright';

async function checkSymggAttachmentImages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const imageUrls = new Set();
  
  page.on('response', async resp => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    if (ct.includes('image') || url.match(/\.(png|webp|avif|jpg|jpeg|svg)(\?|$)/i)) {
      imageUrls.add(url);
    }
  });

  // Go to main page, add MCW first
  await page.goto('https://sym.gg/gunsmith/mw3/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click Add Weapon
  await page.click('a[href*="add-weapon"]');
  await page.waitForTimeout(3000);

  // Type MCW and select it through React-Select
  // The input is react-select-3-input with aria-expanded="false"
  const selectInput = page.locator('#react-select-3-input');
  await selectInput.click();
  await page.waitForTimeout(500);
  await selectInput.fill('MCW');
  await page.waitForTimeout(1500);

  // Wait for the focused option (BAL-27 was focused initially, MCW should be found after typing)
  // Click on the MCW option
  await page.click('[role="option"]:has-text("MCW")');
  await page.waitForTimeout(3000);

  // Now we should be back at the weapon editor with MCW selected
  // The "Hide Weapon Editor" should be visible, showing attachment slots
  await page.waitForSelector('text=Hide Weapon Editor', { timeout: 10000 }).catch(() => {});

  // Find attachment slots and click them to trigger attachment picker
  const editorStructure = await page.evaluate(() => {
    // Find weapon editor panel
    const editorItems = document.querySelectorAll('[class*="editor"] *, [class*="mod"] *, [class*="attachment"] *');
    const results = [];
    for (const el of Array.from(document.body.querySelectorAll('div, section, aside')).filter(e => e.children.length < 15 && e.textContent?.trim().length > 0)) {
      const text = el.textContent?.trim().substring(0, 80);
      const cls = (el.className || '').substring(0, 100);
      if (cls && text) {
        // Check if it might be an attachment slot
        if (text.includes('Muzzle') || text.includes('Barrel') || text.includes('Optic') || text.includes('Stock') || text.includes('Underbarrel') || text.includes('Magazine') || text.includes('Rear Grip') || text.includes('Laser') || text.includes('Ammunition') || text.includes('Guard') || text.includes('Receiver')) {
          results.push({ tag: el.tagName, class: cls, text, children: el.children.length });
        }
      }
    }
    return results;
  });

  console.log('Attachment slot areas:');
  for (const slot of editorStructure) {
    console.log(`  <${slot.tag}> .${slot.class.substring(0, 80)}: "${slot.text}" (${slot.children} children)`);
  }

  // Try clicking on known attachment slot classes
  // Look at the add-weapon page structure - the gun editor UI appears when a weapon is selected
  // The attachment slots in the editor
  
  // Check what the page looks like after weapon selection
  await page.screenshot({ path: 'symgg_mcw_editor.png' });
  
  const pageText = await page.evaluate(() => {
    const mainContent = document.querySelector('main, [class*="content"], [class*="main"], [class*="app"]') || document.body;
    return mainContent.textContent?.substring(0, 3000);
  });
  console.log('\nEditor page content:');
  console.log(pageText);

  // Try to find and click attachment slots
  const slotTexts = ['Muzzle', 'Barrel', 'Optic', 'Stock', 'Underbarrel', 'Magazine', 'Rear Grip', 'Laser', 'Ammunition'];
  for (const slotText of slotTexts) {
    try {
      const el = await page.$(`text=${slotText}`);
      if (el) {
        // Get bounding box to make sure it's visible
        const box = await el.boundingBox();
        if (box) {
          console.log(`\nClicking "${slotText}" at (${box.x}, ${box.y})...`);
          await el.click();
          await page.waitForTimeout(1000);
        }
      }
    } catch (e) {}
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'symgg_after_click_slots.png' });

  console.log('\n\nAll image URLs captured:');
  for (const url of [...imageUrls].sort()) {
    console.log(`  ${url}`);
  }

  await browser.close();
}

checkSymggAttachmentImages().catch(console.error);

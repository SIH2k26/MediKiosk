import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  }
});

test('multi-question interview E2E flow', async ({ page }) => {
  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.error(`[BROWSER ERROR] ${error.message}`));
  
  const networkLogs: string[] = [];
  let ttsCount = 0;
  let dialogueCount = 0;
  let processCount = 0;
  let asrCount = 0;

  // Track network requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/dialogue/next-question') && request.method() === 'POST') {
      dialogueCount++;
      networkLogs.push(`[NETWORK] POST /dialogue/next-question`);
    }
    if (url.includes('/tts/synthesize') && request.method() === 'POST') {
      ttsCount++;
      networkLogs.push(`[NETWORK] POST /tts/synthesize`);
    }
    if (url.includes('/history/process') && request.method() === 'POST') {
      processCount++;
      networkLogs.push(`[NETWORK] POST /history/process`);
    }
    if (url.includes('/asr/transcribe') && request.method() === 'POST') {
      asrCount++;
      networkLogs.push(`[NETWORK] POST /asr/transcribe`);
    }
  });

  // Intercept ASR requests to provide specific mock answers since we're using a fake mic
  let asrInvocationCount = 0;
  await page.route('**/asr/transcribe', async route => {
    asrInvocationCount++;
    let answer = "I don't know";
    if (asrInvocationCount === 1) answer = "I have chest pain radiating to my arm";
    if (asrInvocationCount === 2) answer = "It started 2 hours ago";
    if (asrInvocationCount === 3) answer = "Yes, it goes to my left arm and jaw";
    if (asrInvocationCount === 4) answer = "Yes, I am sweating a lot";
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        transcript: answer,
        language: "en",
        confidence: 0.99,
        provider_used: "mock"
      })
    });
  });

  try {
    console.log("Navigating to /history...");
    await page.goto('http://localhost:3000/history');

    // 1. Verify exactly ONE Q1 appears
    await expect(page.locator('h2.text-display')).toContainText('main reason for your visit', { timeout: 10000 });
    
    // Wait a moment for TTS to potentially double-fire (if buggy)
    await page.waitForTimeout(2000);
    expect(ttsCount).toBe(1); // 2. Q1 TTS is triggered exactly once.
    expect(dialogueCount).toBe(1); // Fresh /history loads exactly one Q1.

    // 4. Click "Tap to Speak"
    await page.click('button:has-text("Tap to Speak")');
    await expect(page.locator('h3:has-text("Listening...")')).toBeVisible();
    
    // 5. Simulate/provide the answer (Stop recording triggers our intercepted ASR)
    await page.waitForTimeout(1000); // Record for 1s
    await page.click('button:has-text("Stop Recording")');

    // 6. Confirm the transcript
    await expect(page.locator('h4:has-text("You said:")')).toBeVisible();
    await expect(page.locator('p.text-heading')).toContainText('I have chest pain');
    
    // Note: Confirming sends answer and fetches next question
    await page.click('button:has-text("Confirm & Continue")');

    // 7. Verify Q1 disappears and Q2 replaces it
    // Wait for Next.js to render the new question (LLM rewrites text, so we can't assert exact string)
    await page.waitForTimeout(4000);
    const q2Text = await page.textContent('h2.text-display');
    expect(q2Text).not.toContain('main reason'); // Should be a different question
    expect(q2Text?.length).toBeGreaterThan(5);
    
    // 8. Verify exactly ONE Q2 appears.
    // Expected counts: dialogue = 2 (cc_main, cp_onset), tts = 2, process = 1 (CC completed)
    expect(ttsCount).toBe(2); 

    // Answer Q2 (cp_onset)
    await page.click('button:has-text("Tap to Speak")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Stop Recording")');
    await expect(page.locator('p.text-heading')).toContainText('started 2 hours ago');
    await page.click('button:has-text("Confirm & Continue")');

    // Q3 (cp_radiation)
    await page.waitForTimeout(4000);
    const q3Text = await page.textContent('h2.text-display');
    expect(q3Text).not.toBe(q2Text);
    expect(ttsCount).toBe(3);

    // Answer Q3
    await page.click('button:has-text("Tap to Speak")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Stop Recording")');
    await expect(page.locator('p.text-heading')).toContainText('left arm and jaw');
    await page.click('button:has-text("Confirm & Continue")');

    // Q4 (cp_sweating)
    await page.waitForTimeout(4000);
    const q4Text = await page.textContent('h2.text-display');
    expect(q4Text).not.toBe(q3Text);
    expect(ttsCount).toBe(4);

    // Answer Q4
    await page.click('button:has-text("Tap to Speak")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Stop Recording")');
    await expect(page.locator('p.text-heading')).toContainText('sweating a lot');
    await page.click('button:has-text("Confirm & Continue")');

    // After this, HPI is complete. It should transition to PAST_MEDICAL_HISTORY.
    // Wait for processing
    await expect(page.locator('h2.text-heading:has-text("Processing section...")')).toBeVisible();
    
    // Should eventually land on next section (PAST_MEDICAL_HISTORY or red flags banner)
    // Check red flags banner
    await expect(page.locator('.badge-emergency')).toBeVisible({ timeout: 15000 });
    
    // Ensure no duplicate red flags
    const redFlagItems = page.locator('.card li');
    const count = await redFlagItems.count();
    expect(count).toBe(1); // Should only be 1 POTENTIAL_ACS flag!

    console.log('--- BROWSER NETWORK REQUESTS ---');
    console.log(networkLogs.join('\n'));
    console.log(`Final Counts - Dialogue: ${dialogueCount}, TTS: ${ttsCount}, ASR: ${asrCount}, Process: ${processCount}`);
  } catch (e) {
    await page.screenshot({ path: 'failure-screenshot.png' });
    console.log('--- BROWSER NETWORK REQUESTS ---');
    console.log(networkLogs.join('\n'));
    throw e;
  }
});

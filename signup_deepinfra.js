const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');
const randomUseragent = require('random-useragent');
const dotenv = require('dotenv');

dotenv.config();

const {MongoClient} = require('mongodb');
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

const database = client.db(process.env.DB_NAME);
const collection = database.collection(process.env.COLLECTION_NAME);

// Apply StealthPlugin
puppeteer.use(StealthPlugin());

// Default user agent as fallback
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function delay(min, max) {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * (max - min) + min));
}

// MongoDB insertion function
async function insertDataToMongoDB(data) {    
    try {
      await client.connect();
      console.log('Connected to MongoDB');
      await collection.insertOne(data);
      console.log('Data inserted into MongoDB:', data);
    } catch (error) {
      console.error('Error inserting data to MongoDB:', error);
      throw error;
    } finally {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }

async function withRetry(fn, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.name === 'ProtocolError' && i < retries - 1) {
        console.warn(`ProtocolError detected, retrying (${i + 1}/${retries})...`);
        await delay(delayMs, delayMs + 1000);
        continue;
      }
      throw error;
    }
  }
}

(async () => {
  // Generate and validate user agent
  let userAgent = randomUseragent.getRandom((ua) => {
    return ua.browserName === 'Chrome' && parseFloat(ua.browserVersion) >= 100;
  });

  // Validate user agent
  if (!userAgent || typeof userAgent !== 'string' || userAgent.length < 10) {
    console.warn('Invalid or empty user agent generated, using default.');
    userAgent = DEFAULT_USER_AGENT;
  }
  console.log('Using User Agent:', userAgent);

  // Launch browser in visible mode
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true, // Display browser window
      executablePath: executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--start-maximized', // Maximize browser window
        `--user-agent=${userAgent}`,
      ],
      defaultViewport: { width: 1920, height: 1080 },
    });

    const page = await browser.newPage();

    // Spoof browser properties
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        ],
      });

      // Spoof WebGL
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
        return getParameter(parameter);
      };

      // Spoof canvas
      HTMLCanvasElement.prototype.toDataURL = function () {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1, 1);
        return canvas.toDataURL();
      };

      // Spoof screen properties
      Object.defineProperty(window, 'screen', {
        get: () => ({
          width: 1920,
          height: 1080,
          availWidth: 1920,
          availHeight: 1040,
          colorDepth: 24,
          pixelDepth: 24,
        }),
      });
    });

    // Set headers
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Block trackers and analytics
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const blockedResources = ['analytics', 'tracker', 'beacon', 'ads', 'fingerprint'];
      if (blockedResources.some((res) => request.url().includes(res))) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Simulate mouse movements
    async function simulateMouseMovements(page) {
      await page.mouse.move(
        Math.floor(Math.random() * 800 + 200),
        Math.floor(Math.random() * 600 + 100),
        { steps: 10 }
      );
      await delay(200, 500);
    }

    // Simulate human typing
    async function humanType(page, selector, text) {
      await page.focus(selector);
      for (const char of text) {
        await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
      }
    }

    // Navigate to login page with retry
    console.log('Navigating to login page...');
    await withRetry(async () => {
      await page.goto('https://deepinfra.com/login', {
        waitUntil: 'networkidle2',
        timeout: 10000,
      });
    });

    // Simulate mouse movements
    await simulateMouseMovements(page);

    // Click "Create one" link
    console.log('Clicking "Create one" link...');
    await withRetry(async () => {
      await page.waitForSelector('a[href="/login#"]', { timeout: 4000 });
      await page.click('a[href="/login#"]');
    });

    // Wait for registration form
    console.log('Waiting for registration form...');
    await withRetry(async () => {
      await page.waitForSelector('input[name="email"]', { timeout: 4000 });
    });

    // Generate random credentials
    const email = `user${Date.now()}@toaik.com`;
    const password = 'MySecurePassword123!';

    // Input credentials
    console.log('Entering credentials...');
    await simulateMouseMovements(page);
    await humanType(page, 'input[name="email"]', email);
    await humanType(page, 'input[name="password"]', password);

    // Random delay before submit
    await delay(3000, 5000);

    // Check for CAPTCHA and pause for manual solving
    console.log('Checking for CAPTCHA...');
    const captchaTimeout = 60000; // 60 seconds to solve CAPTCHA
    const captchaSelectors = [
      'iframe[src*="hcaptcha.com"]', // hCaptcha
      'iframe[src*="recaptcha"]',   // reCAPTCHA
      '.g-recaptcha',               // reCAPTCHA container
      '.h-captcha',                 // hCaptcha container
    ];

    const isCaptchaPresent = await Promise.race([
      Promise.any(captchaSelectors.map((selector) => page.waitForSelector(selector, { timeout: 4000 }))),
      new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);

    if (isCaptchaPresent) {
      console.log('⚠️ CAPTCHA detected! Please solve the CAPTCHA manually in the browser.');
      console.log(`⏳ Waiting ${captchaTimeout / 1000} seconds for you to solve the CAPTCHA...`);
      await delay(captchaTimeout, captchaTimeout);
    } else {
      console.log('No CAPTCHA detected, continuing...');
    }

    // Submit form
    console.log('Submitting form...');
    await withRetry(async () => {
        await page.click('button[type="submit"]');
    });
    // Wait for registration to complete
    console.log('Waiting for registration to complete...');
    await delay(10000, 15000);
    // Submit form
    console.log('Submitting form...');
    await withRetry(async () => {
        await page.click('button[type="submit"]');
    });
    // Wait for registration to complete
    console.log('Waiting for registration to complete...');

    await delay(4000, 5000);

    console.log('✅ Registration completed');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    // Click Dashboard button
    console.log('Clicking Dashboard button...');
    await withRetry(async () => {
      await page.waitForSelector('a[href="/dash"]', { timeout: 3000 });
      await page.click('a[href="/dash"]');
    });

    // Wait for dashboard page to load
    console.log('Waiting for Dashboard page to load...');
    await withRetry(async () => {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
      if (!page.url().includes('/dash')) {
        throw new Error('Failed to navigate to Dashboard');
      }
    });

    // Click API Keys link
    console.log('Clicking API Keys link...');
    await withRetry(async () => {
    await page.waitForSelector('a[href="/dash/api_keys"]', { timeout: 10000 });
    await page.click('a[href="/dash/api_keys"]');
    });

    // Click Toggle Token Visibility button
    console.log('Clicking Toggle Token Visibility button...');
    await withRetry(async () => {
    await page.waitForSelector('button[aria-label="toggle token visibility"]', { timeout: 8000 });
    await page.click('button[aria-label="toggle token visibility"]');
    });

    // Read the value of the API Key input
    console.log('Reading API Key value...');
    let apiKeyValue = null;
    await withRetry(async () => {
    apiKeyValue = await page.$eval('input[name="apiKeyToken"]', (input) => input.value);
    console.log('🔑 API Key:', apiKeyValue);
    });
    const data = {
      "email": email,
      "password": password,
      "api_key": apiKeyValue,
      "status": "active",
      "created_at": new Date().toISOString()
    }
    console.log('Data to be inserted:', data);

    // Insert data into MongoDB
    await insertDataToMongoDB(data);

} catch (error) {
    console.error('❌ Error during registration:', error);
  } finally {
    await browser.close();
  }
})();
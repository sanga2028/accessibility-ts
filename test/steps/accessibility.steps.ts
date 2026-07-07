import { Given, When, Then, setDefaultTimeout, Before, After } from '@cucumber/cucumber';
import { chromium, Browser, Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';
import { generateXmlReport } from '../utils/xmlReportGenerator';
import { generateExcelFromResultsMap } from '../utils/excelReportGenerator';
import * as fs from 'fs';
import * as path from 'path';
import type { AxeResults } from 'axe-core';

console.log('[steps] accessibility.steps.ts loaded');

setDefaultTimeout(120_000);

['reports/html', 'reports/json', 'reports/xml', 'reports/screenshot', 'reports/excel'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

let browser: Browser;
let page: Page;

type ScanItem = { url: string; selectors: string[] };
let scanData: ScanItem[] = [];
const resultsMap: Map<string, AxeResults> = new Map();

Before(async function () {
  const headless = process.env.HEADLESS !== 'false';
  browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  page = await context.newPage();
});

After(async function () {
  await browser.close();
});
//comment
Given('I have the following URLs and optional selectors', function (dataTable) {
  const raw = dataTable.raw() as string[][];
  raw.forEach(row => {
    const url = row[0];
    const selectors = row[1]
      ? row[1].split(',').map(s => s.trim().replace(/['\"]/g, ''))
      : [];
    scanData.push({ url, selectors });
  });
  console.log('Scan Data:', scanData);
});
//hello abhi i'm here 
When('I run accessibility scan based on provided data', async function () {
  for (const { url, selectors } of scanData) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(3000);

    if (selectors.length === 0) {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      resultsMap.set(`${url}::FULL`, results);
    } else {
      for (const selector of selectors) {
        const results = await new AxeBuilder({ page })
          .include(selector)
          .withTags(['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        resultsMap.set(`${url}::${selector}`, results);

        const safe = selector.replace(/[#.]/g, '').replace(/\W+/g, '-');
        const screenshotPath = path.join('reports/screenshot', `${safe}.png`);
        await page.locator(selector).screenshot({ path: screenshotPath });
      }
    }
  }
});

Then('I generate HTML, JSON, and XML reports for all scans', async function () {
  for (const [key, results] of resultsMap.entries()) {
    const safeName = key.replace(/https?:\/\//, '').replace(/\W+/g, '-');
    const reportType = key.includes('FULL') ? 'full' : 'section';

    createHtmlReport({
      results,
      options: {
        projectKey: 'AccessibilityScan',
        outputDir: 'reports/html',
        reportFileName: `${safeName}-${reportType}-report.html`,
      },
    });

    fs.writeFileSync(
      path.join('reports', 'json', `${safeName}-${reportType}-report.json`),
      JSON.stringify(results, null, 2),
      'utf8',
    );

    generateXmlReport(results, key);
    console.log(`Reports generated for ${key}`);
  }

  await generateExcelFromResultsMap(resultsMap);
});

#!/usr/bin/env node

// Config
const baseUrl = 'https://www.dischord.com/fugazi_live_series';

// Includes
const program = require('commander');
const puppeteer = require('puppeteer');

program
  .on('--help', function() {
    console.log('');
    console.log("Fugotcha is a command-line utility for scraping data from the Fugazi Live Series on Dischord.com.");
  })
  .option('-p --page <slug>',
    'Required. The slug of the page to scrape (the URL after "fugazi_live_series")')
  .option('-c --count [count]',
    'Optional. The number of pages to scrape (default: 1); 0 for infinity', 1)
  .action(function () {
    const slug = validatePage(program.page);
    const pageLimit = validateCount(program.count);

    puppeteer.launch().then(async browser => {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/${slug}`);

      let morePagesToScrape, tracks, releaseId;
      let i = 0;
      do {
        tracks = await extractTracks(page);
        releaseId = await extractReleaseId(page);
        console.log(tracks.join(','));
        console.log(releaseId);

        morePagesToScrape = (++i < pageLimit) || (pageLimit === 0);

        if (morePagesToScrape) {
          try {
            await page.$eval('#nextButton a', async match => {
              match.click();
            });
          } catch (e) {
            console.log('No "next" link; reached end of scrapable data.');
            morePagesToScrape = false;
          }
        }
      } while (morePagesToScrape);

      await browser.close();
    });
  })
  .parse(process.argv);

/**
 * Extracts the release ID from a page.
 *
 * @params {Page} page
 *   @see https://github.com/GoogleChrome/puppeteer/blob/v1.10.0/docs/api.md#class-page
 * @return {Promise<String>}
 *   Promise which resolves to the release ID.
 */
function extractReleaseId(page) {
  const productSelector = '#productInfo';
  const releaseSelector = '.releaseNumber';

  return page.waitForSelector(productSelector).then(async elementHandle => {
    return await elementHandle.$eval(releaseSelector, match => {
      return match.innerText.replace('Fugazi Live Series', '').trim();
    });
  });

}

/**
 * Extracts track titles from a page.
 *
 * @params {Page} page
 *   @see https://github.com/GoogleChrome/puppeteer/blob/v1.10.0/docs/api.md#class-page
 * @return {Promise<Array[String]>}
 *   Promise which resolves to an Array of track titles.
 */
function extractTracks(page) {
  const trackListSelector = '.mp3_list';
  const trackSelector = '.track_name';

  return page.waitForSelector(trackListSelector).then(async elementHandle => {
    return await elementHandle.$$eval(trackSelector, matches => {
      return matches.map(track => {
        return track.innerText.trim();
      });
    });
  });
}

/**
 * Returns a validated page slug or aborts the program.
 *
 * @param {String} value
 * @return {String}
 */
function validatePage(value) {
  if (typeof(value) === 'undefined') {
    console.error('Page is a required parameter.');
    process.exit(1);
  }

  // in case the whole path is specified, just get the last bit
  return value.replace('fugazi_live_series/', '');
}

/**
 * Returns a validated count or aborts the program.
 *
 * @param {String} value
 * @return {Number}
 */
function validateCount(value) {
  const limit = Number(value);
  if (Number.isInteger(limit) && limit >= 0) {
    return limit;
  }
  console.error('Count must be a non-negative integer.');
  process.exit(1);
}

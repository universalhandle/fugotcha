#!/usr/bin/env node

// Config
const baseUrl = 'https://www.dischord.com/fugazi_live_series';
const csvFieldSeparator = ',';
const csvTextDelimiter = '"';

// Includes
const chalk = require('chalk');
const fs = require('fs');
const program = require('commander');
const puppeteer = require('puppeteer');

program
  .on('--help', function() {
    console.log('');
    console.log(chalk.bold('Fugotcha is a command-line utility for scraping data from the Fugazi Live Series on Dischord.com.'));
  })
  .option('-o --output <file>',
    'Required. The name of the file to which to output the scraped data.')
  .option('-p --page <slug>',
    'Required. The slug of the page to scrape (the URL after "fugazi_live_series").')
  .option('-c --count [count]',
    'Optional. The number of pages to scrape (default: 1); 0 to scrape until the end of the dataset.', 1)
  .action(function () {
    const slug = validatePage(program.page);
    const pageLimit = validateCount(program.count);
    const outputStream = createOutputStream(program.output);

    process.stdout.write('Fugetting data..');

    puppeteer.launch().then(async browser => {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/${slug}`).then(response => {
        const status = response.headers().status;
        if (status !== '200') {
          console.error(chalk.red('Request of %s failed with a status of %s.'), page.url(), status);
          process.exit(1);
        }
      });

      /*
       * Add headings to CSV.
       *
       * This is brittle, as it will need to be kept in sync with any changes
       * made to the releaseData array below. However, CSV headings are useful,
       * and all the CSV libraries I looked at were extremely opinionated about
       * the CSVs having the same number of fields (to the point where fields
       * would be dropped if they didn't match the heading), so for now:
       */
      outputStream.write(prepareCsvRow([
        'Page Slug',
        'Release ID',
        'Show Date',
        'Venue',
        'Door Price',
        'Attendance',
        'Recorded by',
        'Mastered by',
        'Original Source',
        'Tracks =>'
      ]));

      let morePagesToScrape, tracks, releaseId;
      let i = 0;
      do {
        // This is an "economy" progress indicator. A bona fide progress bar
        // isn't worth the trouble (or would be misleading) because there are
        // lots of cases where it's not easy to determine how many pages are
        // left to scrape (e.g., --count is set to 50 but there are only 2 items
        // left in the dataset, or --count is set to 0 (i.e., all pages) but
        // that number is unknown).
        process.stdout.write('.');

        let releaseData = [];
        releaseData.push(page.url().split('/').pop());
        releaseData.push(await extractReleaseId(page));
        releaseData.push(await extractReleaseDetails('Show Date:', page));
        releaseData.push(await extractReleaseDetails('Venue:', page));
        releaseData.push(await extractReleaseDetails('Door Price:', page));
        releaseData.push(await extractReleaseDetails('Attendance:', page));
        releaseData.push(await extractReleaseDetails('Recorded by', page));
        releaseData.push(await extractReleaseDetails('Mastered by', page));
        releaseData.push(await extractReleaseDetails('Original Source:', page));

        tracks = await extractTracks(page);
        outputStream.write(prepareCsvRow(releaseData.concat(tracks)));

        morePagesToScrape = (++i < pageLimit) || (pageLimit === 0);

        if (morePagesToScrape) {
          try {
            await page.$eval('#nextButton a', async match => {
              match.click();
            });
          } catch (e) {
            console.log(chalk.bold('No "next" link; reached end of scrapable data.'));
            morePagesToScrape = false;
          }
        }
      } while (morePagesToScrape);

      console.log(`\nDone. Data saved in ${program.output}.`);
      outputStream.close();
      await browser.close();
    });
  })
  .parse(process.argv);

/**
 * Returns the supplied string with the CSV delimiter escaped.
 */
function escapeCsvTextDelimiter(string) {
  let regex = new RegExp(csvTextDelimiter);
  let replacement = `${csvTextDelimiter}${csvTextDelimiter}`;
  return string.replace(regex, replacement);
}

/**
 * Extracts a release detail from the page.
 *
 * Release details are marked up in a definition list with no useful attributes
 * for selection, so the definition term (i.e., the text within the tags) is all
 * that can be used for retrieval.
 *
 * @param {String} label
 *   The label of the "release detail" of interest, e.g., "Show Date:"
 * @param {Page} page
 *   @see https://github.com/GoogleChrome/puppeteer/blob/v1.10.0/docs/api.md#class-page
 * @return {Promise<String>}
 *   Resolves to the value of the "release detail" of interest, e.g., "1993-02-13"
 */
function extractReleaseDetails(label, page) {
  return page.waitForSelector('dl.release-details').then(async elementHandle => {
    const dd = (await elementHandle.$x(`//dt[text()="${label}"]/following-sibling::dd`))[0];

    return (typeof dd === 'undefined') ? '' : await page.evaluate(el => {
      return el.textContent.trim();
    }, dd);
  });
}

/**
 * Extracts the release ID from a page.
 *
 * @param {Page} page
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
 * @param {Page} page
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
 * Creates a writeStream from the provided filename.
 *
 * @param {String} value
 * @return {<fs.WriteStream>}
 */
function createOutputStream(filename) {
  if (typeof(filename) === 'undefined') {
    console.error(chalk.red('Output is a required parameter.'));
    process.exit(1);
  }

  return fs.createWriteStream(filename, {flags: 'wx'}).on('error', e => {
    switch (e.code) {
      case 'EEXIST':
        console.error(chalk.red(`File ${filename} already exists; aborting so as not to overwrite.`));
        break;
      default:
        console.error(chalk.red(e.message));
    }
    process.exit(1);
  });
}

/**
 * Formats data for CSV.
 *
 * @param {Array} data
 *   The data which is to be written to CSV.
 * @return {String}
 *   A string, complete with line feed, which can be inserted into a CSV file.
 *
 */
function prepareCsvRow(data = []) {
  let row = data.map(datum => csvTextDelimiter + escapeCsvTextDelimiter(datum) + csvTextDelimiter);
  return row.join(csvFieldSeparator) + "\n";
}

/**
 * Returns a validated page slug or aborts the program.
 *
 * @param {String} value
 * @return {String}
 */
function validatePage(value) {
  if (typeof(value) === 'undefined') {
    console.error(chalk.red('Page is a required parameter.'));
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
  console.error(chalk.red('Count must be a non-negative integer.'));
  process.exit(1);
}

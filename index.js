#!/usr/bin/env node

// Config
const baseUrl = 'https://www.dischord.com/fugazi_live_series';
const trackListSelector = '.mp3_list';
const trackSelector = '.track_name';

// Includes
const program = require('commander');
const puppeteer = require('puppeteer');

program
  .on('--help', function() {
    console.log('');
    console.log("Fugotcha is a command-line utility for scraping data from the Fugazi Live Series on Dischord.com.");
  })
  .option('-p --page <page>',
    'Required. The slug of the page to scrape (the URL after "fugazi_live_series")')
  .option('-c --count [count]',
    'Optional. The number of pages to scrape (default: 1); 0 for infinity', 1)
  .action(function () {
    if (typeof(program.page) === 'undefined') {
      console.error('Page is a required parameter.');
      process.exit(1);
    }

    // in case the whole path is specified, just get the last bit
    let slug = program.page.replace('fugazi_live_series/', '');

    puppeteer.launch().then(async browser => {
      const page = await browser.newPage();
      await page.goto(`${baseUrl}/${slug}`);

      // probably unnecessary since content appears to be rendered server-side
      await page.waitForSelector(trackListSelector);

      const selector = `${trackListSelector} ${trackSelector}`;

      const tracks = await page.$$eval(selector, matches => {
        return matches.map(track => {
          return track.innerHTML.trim();
        });
      });
      console.log(tracks.join(','));

      await browser.close();
    });
  })
  .parse(process.argv);
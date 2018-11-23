#!/usr/bin/env node

const program = require('commander');

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
    let page = program.page.replace('fugazi_live_series/', '');

    console.log('scrape %s for %i pages', page, program.count);
  })
  .parse(process.argv);
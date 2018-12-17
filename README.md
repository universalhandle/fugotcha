# Fugotcha

Fugotcha is a command-line utility for scraping data from the [Fugazi Live
Series on Dischord.com](https://www.dischord.com/fugazi_live_series).

You might be interested in this project if:
* You're a Fugazi-obsessed friend of mine (I have many of these) working on a
  data-visualization project for school (with no data), and your first instinct
  was to collect it manually.
* You're curious about [Puppeteer](https://github.com/GoogleChrome/puppeteer),
  Google's Node library for controlling Chrom(e|ium) programmatically, or any of
  the other [technologies](#technologies) used. This project contains relatively
  simple implementations to get your feet wet.
* You'd like to teach me something about how to do it better. This was a
  learning project for me; [create an issue](https://github.com/GinkgoFJG/fugotcha/new)
  if you've got something to share!

## Installation

Use the package manager npm to install fugotcha.

```bash
npm install --global fugotcha
```

## Requirements
Requires Node v7.6.0 or greater.

## Usage

Scrape every (`-c 0`) release, starting with the first
(`-p washington-dc-usa-90387`), and put the results in /tmp/fugotcha.csv:

```bash
fugotcha -p washington-dc-usa-90387 -c 0 -o /tmp/fugotcha.csv
```

Get help:
```bash
fugotcha -h
```

### Notes
Data is dumped into a CSV-ish file specified by the `-o` option.

CSV-ish? [RFC 4180](https://tools.ietf.org/html/rfc4180) specifies that each
line of a CSV "should contain the same number of fields throughout the file."
Because the number of tracks is variable across releases, the rows of the CSV
will have different numbers of fields unless I  pick an arbitrary number of
tracks (x) and supply empty values for releases with fewer than x tracks.
Doing so, however, guarantees that Fugazi will get together for another show
and play x+1 songs -- and then where would we be?

[LibreOffice](https://www.libreoffice.org/) handles CSV-ish files with unequal
numbers of fields without problem. I suspect most spreadsheet applications do.

## Technologies
* [NodeJS](https://nodejs.org)
* [Puppeteer](https://github.com/GoogleChrome/puppeteer) - Headless Chrome Node
  API
* [Commander](https://www.npmjs.com/package/commander) - Helper for developing
  command-line interfaces
* [Chalk](https://www.npmjs.com/package/chalk) - Helper for styling terminal
  output

### Why Puppeteer?
Dischord's website doesn't appear to do much DOM manipulation via JavaScript.
One could argue that launching a web browser capable of interpreting JavaScript,
headless though it may be, is overkill when the content could be fetched using
`wget` or similar. That's a totally valid argument.

So, why puppeteer? Eh, I wanted to learn something new.

## Contributing
Pull requests are welcome. For major changes, please [open an
issue]((https://github.com/GinkgoFJG/fugotcha/new)) first to discuss what you
would like to change.

## License
[AGPL-3.0](https://choosealicense.com/licenses/agpl-3.0/)

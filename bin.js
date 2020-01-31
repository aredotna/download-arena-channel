const minimist = require('minimist');
const path = require('path');
const fs = require('fs');

const app = require('.');

const argv = minimist(process.argv.slice(2), {
  alias: {
    help: 'h',
  },
  boolean: [
    'help',
    'zip',
    'sources'
  ],
});

if (argv.help || argv._.length < 1) {
  console.log('$ download-arena-channel [--zip, --sources] <slug>');
  process.exit(0)
}

const slug = argv._[0];
const dir = path.join(process.cwd(), slug);

if (!fs.existsSync(dir)) fs.mkdirSync(dir);

app(slug, dir)
  .then(sources => {
    if (argv.sources) {
      const filename = path.join(dir, 'sources.json');
      console.log(`Writing <${filename}>`);
      fs.writeFileSync(filename, JSON.stringify({sources}))
    }

    if (argv.zip) {
      console.log('zipping')
    }
  })

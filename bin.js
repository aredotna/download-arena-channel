const minimist = require('minimist')
const app = require('.')

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

app(argv._[0], { withSources: argv.sources })
  .then(() => {
    // zip
  });

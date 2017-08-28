const R = require('ramda');
const fs = require('fs');
const axios = require('axios');
const parameterize = require('parameterize');
const mime = require('mime');

const args = process.argv.slice(2);
const slug = args[0];
const per = 100; // Content pagination limit
const chunkBy = 10; // N of images to download simultaneously

const channel = slug => ({
  thumb: () => {
    console.log(`Fetching the channel <${slug}>`);
    return axios.get(`https://api.are.na/v2/channels/${slug}/thumb`);
  },

  page: ({ page, per }) => {
    console.log(`Fetching page <${page}>`);
    return axios.get(`https://api.are.na/v2/channels/${slug}/contents?page=${page}&per=${per}`);
  },

  block: block => {
    if (!block.image) return console.log(`Block ${block.id} not downloaded because it does not have an image`);

    console.log(`Downloading <${block.image.original.url}>`);

    const dir = `./downloads/${slug}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    return axios
      .get(block.image.original.url, { responseType: 'arraybuffer' })
      .then(({ data }) => {
        const title = block.title ? parameterize(block.title) : block.id;
        const ext = mime.extension(block.image.content_type);
        const filename = `${dir}/${title}.${ext}`;
        console.log(`Writing <${filename}>`);

        fs.writeFileSync(filename, data);
      })
      .catch(err => {
        console.error(`Failed to download the block <${block.id}>: ${err.stack}`);
      });
  },
});

const client = channel(slug);

client
  .thumb()
  .then(({ data: { title, length } }) => {
    const numberOfPages = Math.ceil(length / per);
    console.log(`The channel <${title}> has ${length} blocks. Proceeding to download...`);
    const request = i => client.page({ page: i + 1, per });
    return Promise.all(R.times(request, numberOfPages));
  })
  .then(responses => {
    const contents = responses.reduce(((memo, { data: { contents } }) => memo.concat(contents)), []);

    R
      .splitEvery(chunkBy, contents)
      .reduce((lastPromise, blocks) => {
        return lastPromise.then(() => Promise.all(blocks.map(client.block)));
      }, Promise.resolve());
  })
  .catch(err => {
    console.error(`An error occurred: ${err.stack}`);
  });

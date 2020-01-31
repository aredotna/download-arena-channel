const R = require('ramda');
const fs = require('fs');
const axios = require('axios');
const parameterize = require('parameterize');
const mime = require('mime');
const path = require('path');
const slugify = require('slugify');

const per = 100; // Content pagination limit
const chunkBy = 10; // N of images to download simultaneously

const channel = (slug, dir) => {
  let untitledCount = 1
  const sources = [];
  
  return {
    thumb: () => {
      console.log(`Fetching the channel <${slug}>`);
      return axios.get(`https://api.are.na/v2/channels/${slug}/thumb`);
    },

    page: ({ page, per }) => {
      console.log(`Fetching page <${page}>`);
      return axios.get(`https://api.are.na/v2/channels/${slug}/contents?page=${page}&per=${per}`);
    },

    imageBlock: block => {
      console.log(`Downloading <${block.image.original.url}>`);

      return axios
        .get(block.image.original.url, { responseType: 'arraybuffer' })
        .then(({ data }) => {
          const title = block.title ? parameterize(block.title) : block.id;
          const ext = mime.extension(block.image.content_type);
          const filename = path.join(dir, `${title}.${ext}`);
          console.log(`Writing <${filename}>`);

          if (block.source && block.source.url) sources.push(block.source.url);
          fs.writeFileSync(filename, data);
        })
        .catch(err => {
          console.error(`Failed to download the block <${block.id}>: ${err.stack}`);
        });
    },

    textBlock: block => { 
      const filename = block.generated_title === 'Untitled' ?
        (block.generated_title + untitledCount++) :
        block.generated_title;
      const filenameSlug = slugify(filename);

      const output = path.join(dir, `${filenameSlug}.md`);
      console.log(`Writing <${output}>`);

      if (block.source && block.source.url) sources.push(block.source.url);
      return fs.writeFileSync(output, block.content);
    },

    getSources: () => sources,
  }
};

module.exports = (slug, dir) => {
  const client = channel(slug, dir);

  return client
    .thumb()
    .then(({ data: { title, length } }) => {
      const numberOfPages = Math.ceil(length / per);
      console.log(`The channel <${title}> has ${length} blocks. Proceeding to download...`);
      const request = i => client.page({ page: i + 1, per });
      return Promise.all(R.times(request, numberOfPages));
    })
    .then(responses => {
      const contents = responses.reduce(((memo, { data: { contents } }) => memo.concat(contents)), []);

      return R
        .splitEvery(chunkBy, contents)
        .reduce((lastPromise, blocks) => {
          return lastPromise.then((lastBlocks) => lastBlocks.concat(blocks))
        }, Promise.resolve([]));
    })
    .then(blocks => {
      return Promise.all(blocks.map(block => {
        if (block.image) return client.imageBlock(block)
        if (block.content) return client.textBlock(block)

        return console.log(`Block ${block.id} not downloaded because it does not have saveable content`);
      }));
    })
    .then(() => client.getSources())
    .catch(err => {
      console.error(`An error occurred: ${err.stack}`);
    });
}

const fs = require('fs');
const axios = require('axios');
const parameterize = require('parameterize');
const mime = require('mime');

const args = process.argv.slice(2);
const slug = args[0];

console.log(`Downloading contents of ${slug}`);

axios.get(`https://api.are.na/v2/channels/${slug}/contents`)
  .then(({ data: { contents } }) => {
    return Promise.all(contents.map(block => {
      console.log(`Downloading <${block.image.original.url}>`);

      const dir = `./downloads/${slug}`;
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      return axios.get(block.image.original.url, { responseType: 'arraybuffer' })
        .then(({ data }) => {
          const title = parameterize(block.title || block.image);
          const ext = mime.extension(block.image.content_type);
          const filename = `${dir}/${title}.${ext}`;
          console.log(`Writing <${filename}>`);

          fs.writeFile(filename, data);
        });
    }));
  });
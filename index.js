const axios = require("axios");
const fs = require("fs");
const path = require("path");

axios({
  url: "https://graphql.fauna.com/graphql",
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.FAUNADB_TOKEN}`
  },
  data: {
    query: `
      query {
        Deputes {
          data {
            Slug
            URLPhotoAssembleeNationnale
          }
        }
      }
    `
  }
})
  .then(result => {
    var deputes = result.data.data.Deputes.data;
    return Promise.all(
      deputes.map(d => {
        const finalImagePath = path.resolve(
          __dirname,
          "depute",
          `${d.Slug}.jpg`
        );
        console.log("finalImagePath:", finalImagePath);
        return axios({
          url: d.URLPhotoAssembleeNationnale,
          method: "GET",
          responseType: "stream"
        }).then(response => {
          response.data.pipe(fs.createWriteStream(finalImagePath));
          return Promise.resolve((resolve, reject) => {
            response.data.on("end", () => {
              resolve();
            });

            response.data.on("error", error => {
              reject(error);
            });
          });
        });
      })
    );
  })
  .then(() => {
    console.log("Done.");
  });

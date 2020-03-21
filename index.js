const fs = require("fs");
const path = require("path");

const axios = require("axios");
const { from } = require("rxjs");
const { mergeMap, toArray } = require("rxjs/operators");

axios({
  url: "https://graphql.fauna.com/graphql",
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.FAUNADB_TOKEN}`
  },
  data: {
    query: `
      query {
        Deputes(_size: 700) {
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
    return from(deputes)
      .pipe(
        mergeMap(d => {
          const finalImagePath = path.resolve(
            __dirname,
            "public",
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
                console.error("error on:", finalImagePath);
                console.error(error);
                reject(error);
              });
            });
          });
        }, 1)
      )
      .pipe(toArray())
      .toPromise();
  })
  .then(() => {
    console.log("Done.");
  });

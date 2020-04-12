const fs = require("fs");
const path = require("path");

const axios = require("axios");
const { from } = require("rxjs");
const { mergeMap, toArray } = require("rxjs/operators");

const { CompressImages } = require("./Utils/Compression");

axios({
  url: "https://graphql.fauna.com/graphql",
  method: "POST",
  headers: {
    Authorization: `Bearer ${
      process.env.FAUNADB_TOKEN || "fnADpOpbETACAhiVb8T4CuVfbe-ivBpfhhmjCJFx"
    }`,
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
    `,
  },
})
  .then((result) => {
    var deputes = result.data.data.Deputes.data;
    return from(deputes)
      .pipe(
        mergeMap((d) => {
          const finalImagePath = path.resolve(
            __dirname,
            "tmp",
            "depute",
            `${d.Slug}.jpg`
          );
          return axios({
            url: d.URLPhotoAssembleeNationnale,
            method: "GET",
            responseType: "stream",
          })
            .then((response) => {
              response.data.pipe(fs.createWriteStream(finalImagePath));
              return Promise.resolve((resolve, reject) => {
                response.data.on("end", () => {
                  console.log(finalImagePath, "written.");
                  resolve();
                });
                response.data.on("error", (error) => {
                  console.error("error on:", finalImagePath);
                  console.error(error);
                  reject(error);
                });
              });
            })
            .catch((err) => {
              if (
                err.response.status === 404 &&
                err.response.statusText === "Not Found"
              ) {
                const finalImagePath = path.resolve(
                  __dirname,
                  "tmp",
                  "depute",
                  `${d.Slug}.png`
                );
                return axios({
                  url: `https://www.nosdeputes.fr/depute/photo/${d.Slug}/192`,
                  method: "GET",
                  responseType: "stream",
                })
                  .then((response) => {
                    response.data.pipe(fs.createWriteStream(finalImagePath));
                    return Promise.resolve((resolve, reject) => {
                      response.data.on("end", () => {
                        console.log(finalImagePath, "written.");
                        resolve();
                      });

                      response.data.on("error", (error) => {
                        console.error("error on:", finalImagePath);
                        console.error(error);
                        reject(error);
                      });
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                  });
              }
            });
        }, 10)
      )
      .pipe(toArray())
      .toPromise();
  })
  .then(() => {
    CompressImages();
    console.log("Done.");
  });

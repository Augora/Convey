const dotenv = require("dotenv");
dotenv.config();

const fs = require("fs");
const path = require("path");
const { from } = require("rxjs");
const { mergeMap, toArray } = require("rxjs/operators");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const axios = require("axios");

const { GetDeputesFromSupabase } = require("./Common/SupabaseClient");

GetDeputesFromSupabase()
  .then((result) => {
    var deputes = result.filter((d) => d !== null);
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
            url: d.URLPhotoAssembleeNationale,
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
                  process.exitCode = 1;
                  console.error("error on:", finalImagePath);
                  console.error(error);
                  reject(error);
                });
              });
            })
            .catch((error) => {
              console.error(
                `${d.Slug}:`,
                error.response.status,
                error.response.statusText
              );
            });
        }, 10)
      )
      .pipe(toArray())
      .toPromise();
  })
  .then(() => {
    return imagemin(["tmp/depute/*.jpg"], {
      destination: "public/depute",
      plugins: [
        imageminMozjpeg({
          quality: 90,
        }),
      ],
    });
  })
  .then((d) => {
    console.log(`${d.length} images optimized.`);
  })
  .catch((e) => {
    process.exitCode = 1;
    console.error("Error:", e);
  });

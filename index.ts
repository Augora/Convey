import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { from } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
import imagemin from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import axios from "axios";

import {
  GetDeputesFromSupabase,
  supabaseClient,
} from "./Common/SupabaseClient";

GetDeputesFromSupabase()
  .then((result) => {
    var deputes: Types.Canonical.Depute[] = result.filter((d) => d !== null);
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
  .then((d) => {
    fs.readdir("./public/depute", (err, files) => {
      files.forEach((file) => {
        fs.readFile(
          path.resolve("./public/depute", file),
          (err, fileContent) => {
            supabaseClient.storage
              .from("deputes")
              .upload(file, fileContent, {
                cacheControl: "3600",
                upsert: true,
                contentType: "image/jpg",
              })
              .then((d) => {
                console.log("success", d);
              })
              .catch((e) => console.error("error", e));
          }
        );
      });
    });
  });

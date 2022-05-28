import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { from } from "rxjs";
import { mergeMap, toArray } from "rxjs/operators";
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
            "public",
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
  .then((d) => {
    fs.readdir(path.resolve(__dirname, "public", "depute"), (err, files) => {
      if (err) {
        console.error("error reading folder:", err);
      }
      return from(files)
        .pipe(
          mergeMap((file) => {
            const fileContent = fs.readFileSync(
              path.resolve(__dirname, "public", "depute", file)
            );
            return supabaseClient.storage
              .from("deputes")
              .upload(file, fileContent, {
                cacheControl: "3600",
                upsert: true,
                contentType: "image/jpg",
              })
              .then((d) => {
                if (d.error) {
                  console.error("Error uploading file to supabase:", d.error);
                }
              });
          }, 10)
        )
        .pipe(toArray())
        .toPromise();
    });
  });

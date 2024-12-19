import test from "./src/test";
import PubSub from "./util/pub-sub";
import chokidar from "chokidar";
import { renameSync } from "fs";
import * as fileFn from "fs";
import path from "path";
import { supplier_uuid } from "./config/config";
import { json } from "stream/consumers";

import { Endpoints } from "./src/core/api/Endpoint_hits";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

var fsfolder = "C:/Users/Akhil/Desktop/learnTypescript/Infolder/";
const filequeue = new PubSub();

// Function to process the file and add it to the queue
const procesfile = (filepath: string) => {
  console.log("In process file", filepath);
  filequeue.publish(filepath);
};

const watcher = chokidar.watch(fsfolder);

// Watch for file additions and trigger procesfile
watcher.on("add", async (filepath: string | Error) => {
  // Check if filepath is an instance of Error
  if (filepath instanceof Error) {
    console.error("Error encountered:", filepath.message);
    return; // If it's an Error, skip processing
  }

  console.log(typeof filepath); // Log the type of filepath to ensure it's a string
  procesfile(filepath); // Call procesfile with the filepath if it's a string

  filequeue.subscribe(async (filepath: string) => {
    var file_contents = fileFn.readFileSync(filepath, "utf-8");

    //  console.log(file_contents,"file contents")
    var data = JSON.parse(file_contents);
    var supplierUUid = supplier_uuid[data.CoCode];

    console.log(supplierUUid, "file contents");

    const points = Endpoints.getInstance();

    if (data.mode == "sales") {
      await points.NormalReportDocuments(data, supplierUUid);

      moveFileToArchive(filepath);
    } else if (data.mode == "cancel") {
      console.log("in cancel mode ");
     await points.Cancel_invoice(data.uuid,data.reason,supplierUUid)
      moveFileToArchive(filepath);


    } else if (data.mode == "getstatus") {
      await points.GetStatus(data,supplierUUid);
      moveFileToArchive(filepath);

      console.log("in get status mode");
    }

    else if(data.mode=="self")
      {
        points.SelfBilled(data,supplierUUid)

      }
  });
  // moveFileToArchive(filepath)
});

// Handle watcher errors
watcher.on("error", (error) => {
  console.error("Watcher error:", error);
});

var ar_fsfolder = "C:/Users/Akhil/Desktop/learnTypescript/archivein/";

const moveFileToArchive = (oldPath: string) => {
  console.log("in moving file");
  const filename = path.basename(oldPath);
  console.log("Moving file to archive: ", filename);
  const newPath = path.join(
    ar_fsfolder,
    filename?.toLowerCase().replace(".json", /* '_' */ "") +
      /* (new Date()).toISOString() +  */ ".json"
  );
  moveFileBase(oldPath, newPath);
};

const moveFileBase = (oldPath: string, newPath: string) => {
  try {
    renameSync(oldPath, newPath);
  } catch (error) {
    console.error(`Error moving file from ${oldPath} to ${newPath}:`, error);
  }
};
// Create an instance of the test class and call its method
// const testfile = new test();
// testfile.newfn(); // Call the newfn method

const path = require('path');
const os = require('os');
const fs = require('fs');
import {Storage} from '@google-cloud/storage';
const { v4: uuidv4 } = require('uuid');
const cors = require('cors')({origin: true});
const Busboy = require('busboy');


exports.danuselfuploadfile = (req, res) => {
    cors(req, res, () => {
        if (req.method === 'POST') {
            const busboy = Busboy({ headers: req.headers });
            const tmpdir = os.tmpdir();
            const storage = new Storage()
            const bucketName="danu_bucket"
            // This object will accumulate all the fields, keyed by their name
            const fields = {};
            // This object will accumulate all the uploaded files, keyed by their name.
            const uploads = {};
            // This code will process each non-file field in the form.
            busboy.on('field', (fieldname, val) => {
                // TODO(developer): Process submitted field values here
                console.log(`Processed field ${fieldname}: ${val}.`);
                fields[fieldname] = val;
            });
            let fileWrites = [];
            // This code will process each file uploaded.
            busboy.on('file', (neme, file, info) => {
                // Note: os.tmpdir() points to an in-memory file system on GCF
                // Thus, any files in it must fit in the instance's memory.
                const { filename, encoding, mimeType } = info;
                console.log(`Processed file ${filename}`);
                const filepath = path.join(tmpdir, filename);
                uploads[neme] = filepath;
                const writeStream = fs.createWriteStream(filepath);
                file.pipe(writeStream);
                // File was processed by Busboy; wait for it to be written to disk.
                const promise = new Promise((resolve, reject) => {
                    file.on('end', () => {
                        writeStream.end();
                    });
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
                fileWrites.push(promise);
            });
            // Triggered once all uploaded files are processed by Busboy.
            // We still need to wait for the disk writes (saves) to complete.
            busboy.on('finish', () => {
                Promise.all(fileWrites)
                    .then(async () => {
                        // TODO(developer): Process saved files here
                        let returnUrlList=[]
                        for (const name in uploads) {
                            const file = uploads[name];
                            console.log(name)
                            console.log(file)
                            console.log(file.split("/").slice(-1)[0])
                            const newFileName=uuidv4()+"."+file.split("\.").slice(-1)[0]
                            console.log(newFileName)
                            await storage.bucket(bucketName).upload(file, {
                                destination: newFileName,
                            });
                            returnUrlList.push("https://storage.googleapis.com/"+bucketName+"/"+newFileName)
                            fs.unlinkSync(file);
                        }
                        res.send(returnUrlList);
                    });
            });
            busboy.end(req.rawBody);
        } else {
            // Return a "method not allowed" error
            res.status(405).end();
        }
    })
}
import { drive_v3, google } from "googleapis";
import { Server, Servers } from "./Servers";
import { BUser, Users } from "./Users";
import { GaxiosResponse } from "gaxios";
import path from "path";
import fs from "fs";

export namespace backup {

    let initialized = false;

    const fileIdPath = path.join(__dirname, "../../", "datas", "google_drive_backup_info.json");
    let backupFolderId: null | string = null;
    let backupFileId: null | string = null;
    let drive: drive_v3.Drive | null = null;

    async function checkDrive() {
        if (fs.existsSync(fileIdPath)) {
            let backupInfo = JSON.parse(fs.readFileSync(fileIdPath).toString());
            backupFolderId = backupInfo["folder_id"];
            backupFileId = backupInfo["file_id"];
        } else {
            // try to fetch for existing file in drive (fetch from <root>/smabot/smabot_data.json)
            console.log("google_drive_backup_info.json does not exist or has invalid data, trying to fetch from Google Drive...");
            let pageToken: string | null | undefined = undefined;
            do {
                let folders: GaxiosResponse<drive_v3.Schema$FileList> | undefined = await drive?.files.list({
                    q: "mimeType='application/vnd.google-apps.folder' and name='smabot'",
                    fields: 'nextPageToken, files(id, name)',
                    spaces: 'drive',
                    pageToken: pageToken
                });

                if (folders?.data.files) {
                    for (let folder of folders.data.files) {
                        let pt: string | null | undefined = undefined;
                        do {
                            let files: GaxiosResponse<drive_v3.Schema$FileList> | undefined = await drive?.files.list({
                                q: `'${folder.id}' in parents and mimeType='application/json' and name='smabot_data.json'`,
                                fields: 'nextPageToken, files(id, name)',
                                spaces: 'drive',
                                pageToken: pt
                            });

                            if (files?.data.files) {
                                for (let file of files.data.files) {
                                    if (folder.id && file.id) {
                                        backupFileId = file.id;
                                        backupFolderId = folder.id;
                                        break;
                                    }
                                }
                            }

                            pt = files?.data.nextPageToken;
                        } while (!backupFolderId && pt);

                        if (backupFolderId)
                            break;
                    }
                }

                pageToken = folders?.data.nextPageToken;
            } while (!backupFolderId && pageToken);

            if (backupFolderId) {
                fs.writeFileSync(fileIdPath, JSON.stringify({
                    folder_id: backupFolderId,
                    file_id: backupFileId
                }));
                console.log("Fetching from Google Drive found!");
            } else {
                console.log("Fetching from Google Drive not found! New folder and file will be created on Google Drive when needed.");
            }
        }
    }

    /**
     * Initialize backup process for the first time. Must be called before every backup functions.
     */
    export async function init() {
        if (!initialized) {
            const auth = new google.auth.GoogleAuth({
                keyFile: path.join(__dirname, "../../", "datas", "google_api_credentials.json"),
                scopes: ['https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.appdata',
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive.metadata',
                    'https://www.googleapis.com/auth/drive.metadata.readonly',
                    'https://www.googleapis.com/auth/drive.photos.readonly',
                    'https://www.googleapis.com/auth/drive.readonly',],
            });

            google.options({
                auth: auth
            });

            drive = google.drive({
                version: 'v3',
                auth: auth
            });

            await checkDrive();

            initialized = true;
        }
    }

    export async function upload() {
        if (!backupFileId) {
            await createFile();
            return; //return because the file is already uploaded in createFile()
        }

        await drive?.files.update({
            fileId: backupFileId,
            media: {
                mimeType: "application/json",
                body: JSON.stringify(serialize())
            }
        });
        console.log("Successfully uploaded backup!");
    }

    async function createFile() {
        console.log("Existing backup not found, creating new one...");
        let folder = await drive?.files.create({
            fields: 'id',
            requestBody: {
                'name': 'smabot',
                'mimeType': 'application/vnd.google-apps.folder'
            }
        });
        backupFolderId = folder?.data.id ?? null;

        let file = await drive?.files.create({
            requestBody: {
                'name': 'smabot_data.json',
                parents: [backupFolderId!]
            },
            media: {
                mimeType: 'application/json',
                body: JSON.stringify(serialize())
            },
            fields: 'id'
        });
        backupFileId = file?.data.id ?? null;

        fs.writeFileSync(fileIdPath, JSON.stringify({
            folder_id: backupFolderId,
            file_id: backupFileId
        }));
        console.log("Creating new backup file completed!");
    }

    async function loadString(): Promise<string> {
        if (!backupFileId) {
            await createFile();
            return JSON.stringify(serialize()); // File has just been created, return the current value.
        }

        let file = await drive?.files.get({
            fileId: backupFileId,
            alt: 'media'
        }, {
            responseType: 'stream'
        });

        const chunks: Uint8Array[] = [];
        return new Promise((resolve, reject) => {
            file?.data.on('data', chunk => chunks.push(chunk))
            file?.data.on('error', reject)
            file?.data.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        })
    }

    export async function load() {
        let obj = JSON.parse(await loadString());
        deserialize(obj);
        console.log("Sucessfully loaded backup!");
    }

    function serialize(): object {
        let users: any = {};
        for (let [id, user] of Users.users) {
            users[id] = user.serialize();
        }

        let servers: any = {};
        for (let [id, server] of Servers.servers) {
            servers[id] = server.serialize();
        }

        return {
            servers: servers,
            users: users
        };
    }

    function deserialize(obj: any): void {
        let servers = obj["servers"];
        for (let id in servers) {
            Servers.servers.set(id, Server.deserialize(servers[id]));
        }

        let users = obj["users"];
        for (let id in users) {
            Users.users.set(id, BUser.deserialize(users[id]));
        }
    }
}

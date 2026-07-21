import { google } from 'googleapis';
import { config } from '../config/env.js';
import stream from 'stream';

// ##################################
// GOOGLE DRIVE CONFIGURATION
// Replace Folder ID
// Replace OAuth Credentials
// Replace Service Account
// ##################################

let driveClient = null;

const getDriveClient = () => {
  if (driveClient) return driveClient;

  const email = config.googleClientEmail;
  const privateKey = config.googlePrivateKey;
  const rootFolderId = config.googleDriveFolderId;

  if (!email || !privateKey || privateKey === '') {
    console.warn('[WARNING] Google Drive integration skipped: Service Account credentials missing in .env.');
    return null;
  }

  try {
    const auth = new google.auth.JWT(
      email,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive']
    );

    driveClient = google.drive({ version: 'v3', auth });
    return driveClient;
  } catch (err) {
    console.error('[ERROR] Failed to initialize Google Drive client:', err.message);
    return null;
  }
};

/**
 * Creates a folder inside Google Drive
 */
export const createFolder = async (folderName, parentFolderId = null) => {
  const drive = getDriveClient();
  if (!drive) {
    console.log(`[DRIVE MOCK] Folder '${folderName}' created virtually.`);
    return `mock_folder_id_${Math.random().toString(36).substr(2, 9)}`;
  }

  const parentId = parentFolderId || config.googleDriveFolderId;

  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId && parentId !== 'drive_folder_placeholder_id' ? [parentId] : []
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, webViewLink'
    });

    console.log(`Created Drive folder: ${folderName} (${folder.data.id})`);
    return folder.data.id;
  } catch (err) {
    console.error(`Failed to create Google Drive folder '${folderName}':`, err.message);
    return `error_folder_id_${Date.now()}`;
  }
};

/**
 * Generates a shareable reader link for a Google Drive folder or file
 */
export const generateShareableLink = async (fileId) => {
  const drive = getDriveClient();
  if (!drive) {
    return `https://drive.google.com/drive/folders/mock_shareable_${fileId}`;
  }

  try {
    // Grant reader permission to anyone
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'webViewLink'
    });

    return fileInfo.data.webViewLink;
  } catch (err) {
    console.error(`Failed to generate shareable link for Drive file '${fileId}':`, err.message);
    return `https://drive.google.com/drive/folders/${fileId}`;
  }
};

/**
 * Uploads a file (from buffer or stream) to a specific Drive folder
 */
export const uploadFileToFolder = async (fileName, fileBuffer, mimeType, folderId) => {
  const drive = getDriveClient();
  if (!drive) {
    console.log(`[DRIVE MOCK] File '${fileName}' uploaded virtually to folder '${folderId}'.`);
    return `https://drive.google.com/open?id=mock_file_id_${Date.now()}`;
  }

  try {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log(`Uploaded file to Drive: ${fileName} (${file.data.id})`);
    
    // Generate public link
    return await generateShareableLink(file.data.id);
  } catch (err) {
    console.error(`Failed to upload file '${fileName}' to Drive:`, err.message);
    return `https://drive.google.com/drive/folders/${folderId}`;
  }
};

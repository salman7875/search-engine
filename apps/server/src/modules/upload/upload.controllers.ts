import type { Request, Response } from 'express';
import { fileProcessQueue, queueType } from '@repo/queue';
import {
  createObjectCommand,
  getObjectCommand,
  generateSignedUrl,
} from '@repo/aws/s3';

const getUploadUrl = async (req: Request, res: Response) => {
  try {
    const { fileName, fileType } = req.body;
    const s3Key = `uploads/${Date.now()}-${fileName}`;
    const contentType = fileType || 'application/octet-stream';

    const command = await createObjectCommand({
      bucketName: 'my-bucket',
      key: s3Key,
      contentType,
    });

    let uploadUrl = await generateSignedUrl(command);

    if (process.env.NODE_ENV !== 'production' && process.env.AWS_ENDPOINT_URL) {
      uploadUrl = uploadUrl.replace(
        'http://floci:4566',
        'http://localhost:4566',
      );
    }
    res.status(201).json({ success: true, data: { uploadUrl, key: s3Key } });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
};

const uploadDoc = async (req: Request, res: Response) => {
  try {
    const { key, fileName } = req.body;

    const command = await getObjectCommand({ bucketName: 'my-bucket', key });
    const presignedUrl = await generateSignedUrl(command);

    fileProcessQueue.add(
      queueType.FileProcessJobName.PROCESS_FILE,
      presignedUrl,
    );
    res.status(201).json({
      success: true,
      message: 'File is being added to the queue!',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error });
  }
};

export const uploadController = {
  getUploadUrl,
  uploadDoc,
};

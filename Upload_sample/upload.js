class S3Uploader {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }

    async getUploadUrl(file) {
        const fileName = file.name;
        const fileType = file.type;

        const response = await fetch(`${this.apiUrl}?file_name=${encodeURIComponent(fileName)}&file_type=${encodeURIComponent(fileType)}`);
        const data = await response.json();
        return data.upload_url;
    }

    async uploadFile(file, progressCallback) {
        const uploadUrl = await this.getUploadUrl(file);

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && progressCallback) {
                const progress = (event.loaded / event.total) * 100;
                progressCallback(progress);
            }
        };

        return new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(uploadUrl.split('?')[0]);  // Return file URL after upload
                } else {
                    reject(`Failed to upload: ${xhr.statusText}`);
                }
            };

            xhr.onerror = () => reject('Upload failed');
            xhr.send(file);
        });
    }
}

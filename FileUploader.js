document.addEventListener('DOMContentLoaded', function () {
    const lambdaUrl = 'https://45xhcs9iue.execute-api.ap-south-1.amazonaws.com/Release/fileupload';
    let uploadedFiles = [];  // Store existing file URLs
    let dropzoneInstance;     // Declare dropzoneInstance here

    // Fetch existing files and initialize Dropzone with them
    function loadExistingFiles() {
        const existingFilesInput = document.querySelector('input[name="existing_files"]');
        if (existingFilesInput && existingFilesInput.value) {
            const existingFiles = existingFilesInput.value.split(',');
            existingFiles.forEach(fileUrl => {
                if (fileUrl) {
                    uploadedFiles.push(fileUrl);
                    addFileToDropzone(fileUrl);
                }
            });
        }
    }

    function addFileToDropzone(fileUrl) {
        const mockFile = { name: fileUrl.split('/').pop(), size: 12345, accepted: true };
        dropzoneInstance.emit("addedfile", mockFile);
        dropzoneInstance.emit("thumbnail", mockFile, fileUrl);  // Optional: If you want to display file thumbnail
        dropzoneInstance.emit("complete", mockFile);
    }

    // Disable Dropzone's auto-discovery to prevent automatic attachment
    Dropzone.autoDiscover = false;

    // Remove any existing Dropzone instances to prevent "already attached" error
    if (Dropzone.instances.length > 0) {
        Dropzone.instances.forEach(instance => instance.destroy());
    }

    // Initialize Dropzone
    dropzoneInstance = new Dropzone('#file-upload-area', {
        url: '#',  // Provide a dummy URL since we're manually handling uploads
        autoProcessQueue: false,  // Prevent auto uploading, we will manually upload
        parallelUploads: 10,
        maxFilesize: 7000,  // Max file size in MB
        acceptedFiles: "*",  // Accept any file type (can be customized)

        // Customizing the text in the Dropzone box
        dictDefaultMessage: "Drag and drop files here or click to upload",  // Custom message
        dictFallbackMessage: "Your browser does not support drag and drop file uploads.",
        dictFileTooBig: "File is too big ({{filesize}}MB). Max allowed size is {{maxFilesize}}MB.",
        dictInvalidFileType: "You can't upload files of this type.",
        dictRemoveFile: "Remove file",
        dictCancelUpload: "Cancel upload",

        init: function () {
            // Event listener for input changes
            const existingFilesInput = document.querySelector('input[name="existing_files"]');
            existingFilesInput.addEventListener('change', loadExistingFiles);

            this.on("addedfile", async function (file) {
                // Get the signed URL
                const signedUrl = await getSignedUrl(file);

                // Manually send the file to the signed URL
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', signedUrl, true);
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        const fileUrl = signedUrl.split('?')[0];  // Get the file URL without the query params
                        uploadedFiles.push(fileUrl);
                        updateHiddenField();
                        dropzoneInstance.emit('success', file, { fileUrl });
                    } else {
                        dropzoneInstance.emit('error', file, 'Upload error');
                    }
                };
                xhr.onerror = function () {
                    dropzoneInstance.emit('error', file, 'Upload failed');
                };
                xhr.send(file);
            });

            this.on("removedfile", async function (file) {
                const fileUrl = uploadedFiles.find(url => url.includes(file.name));
                await deleteFileFromServer(fileUrl);
                uploadedFiles = uploadedFiles.filter(url => url !== fileUrl);
                updateHiddenField();
            });
        }
    });

    // Function to update the hidden input field with uploaded file URLs
    function updateHiddenField() {
        document.querySelector('input[name="existing_files"]').value = uploadedFiles.join(',');
    }

    // Function to get signed URL
    async function getSignedUrl(file) {
        const response = await fetch(`${lambdaUrl}?file_name=${file.name}&file_type=${file.type}`);
        const data = await response.json();
        return data.upload_url;
    }

    // Function to delete file from server
    async function deleteFileFromServer(fileUrl) {
        const url = `${lambdaUrl}?url=${encodeURIComponent(fileUrl)}`;
        await fetch(url, { method: 'GET' });
    }
});

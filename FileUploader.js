document.addEventListener('DOMContentLoaded', function () {
    // Lambda URL for signed URL generation and file deletion
    const lambdaUrl = 'https://45xhcs9iue.execute-api.ap-south-1.amazonaws.com/Release/fileupload';

    // Function to generate the presigned URL from the Lambda
    async function getSignedUrl(file) {
        const response = await fetch(`${lambdaUrl}?file_name=${file.name}&file_type=${file.type}`);
        const data = await response.json();
        return data.upload_url;
    }

    // Function to replace URL input fields with upload functionality
    function initializeFileUploadFields() {
        // Find all input fields with the data-file-upload attribute
        document.querySelectorAll('input[data-file-upload]').forEach(inputField => {
            if (inputField.type === 'text') {
                createFileUploadUI(inputField);
            }
        });
    }

    // Function to create the file upload UI (file input, progress bar, etc.)
    function createFileUploadUI(inputField) {
        // Hide the original input field and create a hidden input
        inputField.type = 'hidden';
        const hiddenField = inputField;

        const fileURL_display = document.createElement('div');
        fileURL_display.innerText = inputField.value;

        // Create a new file input for multiple file uploads
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*';  // Accept any file type (you can adjust this)
        fileInput.multiple = true;  // Allow multiple file uploads

        // Container for uploaded file items
        const fileListContainer = document.createElement('div');

        // Event listener for file selection
        fileInput.addEventListener('change', async function (event) {
            const files = Array.from(event.target.files);
            for (const file of files) {
                try {
                    const signedUrl = await getSignedUrl(file);
                    const fileItem = createFileItem(file, signedUrl, hiddenField, fileInput, fileURL_display, fileListContainer);
                    fileListContainer.appendChild(fileItem);
                } catch (error) {
                    console.error('Error generating signed URL:', error);
                }
            }
            fileInput.value = '';  // Reset the file input after upload
        });

        // Insert the file input and file list container into the DOM
        inputField.parentNode.insertBefore(fileInput, inputField.nextSibling);
        inputField.parentNode.insertBefore(fileListContainer, fileInput.nextSibling);
    }

    // Function to create a UI element for each uploaded file
    function createFileItem(file, signedUrl, hiddenField, fileInput, fileURL_display, fileListContainer) {
        const fileItem = document.createElement('div');
        const progressBar = document.createElement('progress');
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.style.display = 'none';

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove File';
        removeButton.style.display = 'none';

        // Remove re-declaration of fileURL_display here

        // Upload the file
        uploadFile(file, signedUrl, hiddenField, progressBar, removeButton, fileInput, fileURL_display);

        // Event listener to remove the file
        removeButton.addEventListener('click', async function (event) {
            event.preventDefault();
            const fileUrl = signedUrl.split('?')[0];  // Get the file URL without query params
            try {
                // Call the Lambda to delete the file
                await fetch(`${lambdaUrl}?url=${encodeURIComponent(fileUrl)}`, { method: 'GET' });

                // Remove the file URL from the hidden field
                const urlArray = hiddenField.value.split(',').filter(url => url !== fileUrl);
                hiddenField.value = urlArray.join(',');

                // Remove the file item from the DOM
                fileListContainer.removeChild(fileItem);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        });

        // Append UI elements
        fileItem.appendChild(fileURL_display);
        fileItem.appendChild(progressBar);
        fileItem.appendChild(removeButton);

        return fileItem;
    }


    // Function to upload the file
    function uploadFile(file, signedUrl, hiddenField, progressBar, removeButton, fileInput, fileURL_display) {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl, true);

        // Show the progress bar
        progressBar.style.display = 'block';

        // Track upload progress
        xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.value = percentComplete;
            }
        };

        // On upload complete
        xhr.onload = function () {
            if (xhr.status === 200) {
                const fileUrl = signedUrl.split('?')[0];  // Get the file URL without query params
                fileURL_display.innerText = fileUrl;
                fileURL_display.style.display = 'inline-block';
                progressBar.style.display = 'none';
                removeButton.style.display = 'inline-block';

                // Append the new URL to the hidden field as a comma-separated string
                const currentUrls = hiddenField.value ? hiddenField.value.split(',') : [];
                currentUrls.push(fileUrl);
                hiddenField.value = currentUrls.join(',');
            } else {
                console.error('File upload failed:', xhr.responseText);
                fileInput.disabled = false;  // Re-enable the file input
            }
        };

        // On upload error
        xhr.onerror = function () {
            console.error('Error during file upload.');
            fileInput.disabled = false;  // Re-enable the file input
        };

        // Start uploading the file
        xhr.send(file);
    }

    // Initialize the file upload fields on page load
    initializeFileUploadFields();

    // Re-initialize file upload fields if new elements are dynamically added
    const observer = new MutationObserver(function (mutationsList, observer) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                initializeFileUploadFields();
            }
        }
    });

    // Observe the body for changes (e.g., new input fields added dynamically)
    observer.observe(document.body, { childList: true, subtree: true });
});

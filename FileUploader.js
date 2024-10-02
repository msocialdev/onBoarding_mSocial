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
        


        // Create a new file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*';  // Accept any file type (you can adjust this)

        // Create a progress bar
        const progressBar = document.createElement('progress');
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.style.display = 'none';  // Hide by default

        // Create a remove file button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove File';
        removeButton.style.display = 'none';  // Hide by default

        // Event listener for file selection
        fileInput.addEventListener('change', async function (event) {
            const file = event.target.files[0];
            if (file) {
                // Disable file input to prevent changes during upload
                fileInput.disabled = true;

                try {
                    const signedUrl = await getSignedUrl(file);
                    uploadFile(file, signedUrl, hiddenField, progressBar, removeButton, fileInput,fileURL_display);
                } catch (error) {
                    console.error('Error generating signed URL:', error);
                }
            }
        });

        // Event listener for removing the uploaded file
        removeButton.addEventListener('click', async function (event) {
            event.preventDefault();  // Prevent default button action
            const fileUrl = hiddenField.value;
            if (fileUrl) {
                try {
                    // Call the Lambda to delete the file
                    await fetch(`${lambdaUrl}?url=${encodeURIComponent(fileUrl)}`, { method: 'GET' });
                    hiddenField.value = '';  // Clear the hidden field
                    fileInput.disabled = false;  // Enable file input
                    fileInput.value = "";
                    fileInput.style.display = 'inline-block'; 
                    fileURL_display.style.display = 'none'; 
                    progressBar.style.display = 'none';  // Hide progress bar
                    removeButton.style.display = 'none';  // Hide remove button
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }
        });

        // Insert the file input, progress bar, and remove button into the DOM
        inputField.parentNode.insertBefore(fileInput, inputField.nextSibling);
        inputField.parentNode.insertBefore(progressBar, fileInput.nextSibling);
        inputField.parentNode.insertBefore(fileURL_display, progressBar.nextSibling);
        inputField.parentNode.insertBefore(removeButton, fileURL_display.nextSibling);
        
        if (inputField.value)
        {
            fileInput.style.display = 'none'; 
            progressBar.style.display = 'none';
            fileURL_display.style.display = 'inline-block'; 
            removeButton.style.display = 'inline-block';
        }
        else
        {
            fileInput.style.display = 'inline-block'; 
            progressBar.style.display = 'none';
            fileURL_display.style.display = 'none'; 
            removeButton.style.display = 'inline-block';
        }
    }

    // Function to upload the file
    function uploadFile(file, signedUrl, hiddenField, progressBar, removeButton, fileInput,fileURL_display) {
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
                // Set the final URL in the hidden input field
                const fileUrl = signedUrl.split('?')[0];  // Get the file URL without query params
                hiddenField.value = fileUrl;

                // Show the remove button and enable the file input
                fileInput.style.display = 'none'; 
                progressBar.style.display = 'none';
                removeButton.style.display = 'inline-block';
                fileURL_display.innerText = fileUrl;
                fileURL_display.style.display = 'inline-block';
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

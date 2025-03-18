document.addEventListener('DOMContentLoaded', function () {
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');
    const viewAllBtn = document.getElementById('viewAllBtn');
    const openUploadBtn = document.getElementById('openUploadBtn');

    // Predefined XML files
    const filenames = [
        'Test.settings-meta.xml'
        // 'Accounting.settings-meta.xml',
        // 'Activities.settings-meta.xml'
        // Add more filenames as needed
    ];

    // Populate the dropdown with filenames
    filenames.forEach(filename => {
        const option = document.createElement('option');
        option.value = filename;
        option.textContent = filename;
        fileList.appendChild(option);
    });

    // Display file content when a file is selected
    fileList.addEventListener('change', function () {
        const selectedFile = fileList.value;
        if (selectedFile) {
            // Show loading message
            fileContent.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
            
            // Fetch actual XML file from sample directory
            const filePath = `sample/${selectedFile}`;
            fetch(chrome.runtime.getURL(filePath))
                .then(response => response.text())
                .then(xmlText => {
                    // Parse and format XML
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                    const serializer = new XMLSerializer();
                    const formattedXml = serializer.serializeToString(xmlDoc)
                        .replace(/>\s+</g, '>\n<') // Add line breaks
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');

                    // Display formatted content with monospace font
                    fileContent.innerHTML = `<pre>${formattedXml}</pre>`;
                })
                .catch(error => {
                    fileContent.innerHTML = `<div class="alert alert-danger">Error loading file: ${error.message}</div>`;
                });
        } else {
            fileContent.textContent = '';
        }
    });
    
    // View all files in a new tab
    viewAllBtn.addEventListener('click', function() {
        // Store filenames in localStorage for the new tab to access
        localStorage.setItem('predefinedFiles', JSON.stringify(filenames));
        // Open new tab with a flag to load all files
        console.log('Opening new tab with xml-viewer.html?viewAll=true');
        window.open('xml-viewer.html?viewAll=true', '_blank');
    });
    
    // Open the upload page in a new tab
    openUploadBtn.addEventListener('click', function() {
        console.log('Opening new tab with xml-viewer.html');
        window.open('xml-viewer.html', '_blank');
    });
});
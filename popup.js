document.addEventListener('DOMContentLoaded', function () {
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');

    // Simulate fetching filenames from a specified folder
    const filenames = [
        'Account.settings-meta.xml',
        'Accounting.settings-meta.xml',
        'Activities.settings-meta.xml'
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
            // Simulate fetching file content
            // Fetch actual XML file from settings directory
            const filePath = `settings/${selectedFile}`;
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
                    fileContent.textContent = `Error loading file: ${error.message}`;
                });
        } else {
            fileContent.textContent = '';
        }
    });
});
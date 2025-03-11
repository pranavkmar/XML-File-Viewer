document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileContent = document.getElementById('fileContent');

    fileInput.addEventListener('change', function () {
        const files = Array.from(fileInput.files);
        fileList.innerHTML = '<option value="">Select a file</option>'; // Reset the dropdown

        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file.name;
            option.textContent = file.name;
            fileList.appendChild(option);
        });
    });

    fileList.addEventListener('change', function () {
        const selectedFile = fileList.value;
        if (selectedFile) {
            const file = Array.from(fileInput.files).find(f => f.name === selectedFile);
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const formattedXml = formatXml(e.target.result);
                    fileContent.innerHTML = '<pre class="prettyprint">' + e.target.result.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
                    PR.prettyPrint();
                };
                reader.readAsText(file);
            }
        } else {
            fileContent.textContent = '';
        }
    });

    function formatXml(xml, tab) { // tab = optional indent value, default is tab (\t)
        var formatted = '', indent= '';
        tab = tab || '\t';
        xml.split(/>\s*</).forEach(function(node) {
            if (node.match( /^\/\w/ )) indent = indent.substring(tab.length); // decrease indent by one 'tab'
            formatted += indent + '<' + node + '>\r\n';
            if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;              // increase indent
        });
        return formatted.substring(1, formatted.length-3);
    }
});
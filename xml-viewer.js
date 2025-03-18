document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const sidebar = document.getElementById('sidebar');
    const tocList = document.getElementById('tocList');
    const fileCountSpan = document.getElementById('fileCount');
    const xmlContent = document.getElementById('xmlContent');
    const timestampElement = document.getElementById('timestamp');
    const stickyNavbar = document.querySelector('.sticky-navbar');
    const exportHtmlBtn = document.getElementById('exportHtml');
    
    // Update timestamp
    const now = new Date();
    timestampElement.textContent = `Generated on ${now.toLocaleString()}`;
    
    // Set up TOC toggle functionality
    const tocToggle = document.getElementById('tocToggle');
    if (tocToggle) {
        tocToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            tocToggle.textContent = sidebar.classList.contains('collapsed') ? 'Expand' : 'Collapse';
        });
    }
    
    // Toggle sidebar expansion
    const sidebarTab = document.querySelector('.sidebar-tab');
    if (sidebarTab) {
        sidebarTab.addEventListener('click', function() {
            sidebar.classList.toggle('expanded');
        });
    }
    
    // Handle navbar shrinking on scroll
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 50) {
            stickyNavbar.classList.add('scrolled');
        } else {
            stickyNavbar.classList.remove('scrolled');
        }
    });
    
    // Export HTML functionality
    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', function() {
            // Create a new document with current content
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>XML File Export</title>
                    <style>
                        .export-html-body { font-family: Arial, sans-serif; padding: 20px; }
                        .xml-file-section { margin-bottom: 50px; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
                        .export-html-h1 { color: #333; }
                        h2 { margin-top: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
                        .export-html-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        .export-html-th, .export-html-td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                        .export-html-th { background-color: #f8f9fa; position: sticky; top: 0; z-index: 1; border-bottom: 2px solid #dee2e6; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
                        .export-html-badge { display: inline-block; padding: 3px 6px; font-size: 12px; font-weight: 700;
                                line-height: 1; color: #fff; background-color: #6c757d; border-radius: 4px; margin-right: 5px; }
                    </style>
                </head>
                <body class="export-html-body">
                    <h1 class="export-html-h1">XML File Export</h1>
                    ${document.getElementById('xmlContent').innerHTML.replace(/table class="table/g, 'table class="export-html-table').replace(/<th/g, '<th class="export-html-th"').replace(/<td/g, '<td class="export-html-td"').replace(/badge bg-secondary/g, 'export-html-badge')}
                    <footer>
                        <p>Exported on ${new Date().toLocaleString()}</p>
                    </footer>
                </body>
                </html>
            `;
            
            // Create a blob and download link
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'xml-export-' + new Date().toISOString().slice(0, 10) + '.html';
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        });
    }
    
    // Check if we should load predefined files (from viewAll parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('viewAll') === 'true') {
        // Get predefined files from localStorage
        try {
            const predefinedFiles = JSON.parse(localStorage.getItem('predefinedFiles') || '[]');
            if (predefinedFiles.length > 0) {
                loadPredefinedFiles(predefinedFiles);
            }
        } catch (error) {
            console.error('Error loading predefined files:', error);
        }
    }
    
    // Function to load predefined XML files
    function loadPredefinedFiles(filenames) {
        if (!filenames || filenames.length === 0) return;
        
        // Show loading message
        xmlContent.innerHTML = '<div class="alert alert-info">Loading predefined XML files...</div>';
        
        // Reset the TOC
        tocList.innerHTML = '';
        fileCountSpan.textContent = `(${filenames.length} files)`;
        sidebar.classList.add('expanded'); // Show the sidebar
        
        // Load each file
        Promise.all(filenames.map(filename => {
            return fetchXmlFile(filename);
        }))
        .then(xmlDataList => {
            // Filter out any failed loads
            const validData = xmlDataList.filter(data => data !== null);
            
            // Clear loading message
            xmlContent.innerHTML = '';
            
            if (validData.length === 0) {
                xmlContent.innerHTML = '<div class="alert alert-warning">No valid XML files found.</div>';
                return;
            }
            
            // Update file count
            fileCountSpan.textContent = `(${validData.length} files)`;
            
            // Generate TOC and content for each file
            validData.forEach((xmlData, index) => {
                const fileId = `file-${index+1}`;
                
                // Add to TOC
                const tocItem = document.createElement('li');
                const tocLink = document.createElement('a');
                tocLink.href = `#${fileId}`;
                tocLink.textContent = xmlData.filename;
                tocItem.appendChild(tocLink);
                tocList.appendChild(tocItem);
                
                // Create file section
                const fileSection = createXmlFileSection(xmlData, fileId);
                xmlContent.appendChild(fileSection);
            });
        })
        .catch(error => {
            xmlContent.innerHTML = `<div class="alert alert-danger">Error loading XML files: ${error.message}</div>`;
        });
    }
    
    // Fetch a single XML file from the extension's resources
    function fetchXmlFile(filename) {
        const filePath = `settings/${filename}`;
        
        return fetch(chrome.runtime.getURL(filePath))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${filename}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(xmlText => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                
                // Check for parsing errors
                const parserError = xmlDoc.querySelector('parsererror');
                if (parserError) {
                    throw new Error(`XML parsing error in ${filename}`);
                }
                
                const root = xmlDoc.documentElement;
                
                // Extract namespace if present
                let namespace = "";
                const nsMatch = root.tagName.match(/^(.+):/);
                if (nsMatch) {
                    namespace = nsMatch[1];
                }
                
                // Process elements - get children of root
                const elements = Array.from(root.children).map(child => processElement(child));
                
                return {
                    filename: filename,
                    root_tag: root.tagName,
                    namespace: namespace,
                    elements: elements
                };
            })
            .catch(error => {
                console.error(`Error processing ${filename}:`, error);
                return null; // Return null for failed files
            });
    }

    fileInput.addEventListener('change', function () {
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) {
            sidebar.classList.remove('expanded'); // Hide sidebar
            xmlContent.innerHTML = '';
            return;
        }
        
        // Show loading message
        xmlContent.innerHTML = '<div class="alert alert-info">Processing XML files...</div>';
        
        // Reset the TOC and content
        tocList.innerHTML = '';
        fileCountSpan.textContent = `(${files.length} files)`;
        sidebar.classList.add('expanded'); // Show sidebar
        
        // Process all files
        Promise.all(files.map(processXmlFile))
            .then(xmlDataList => {
                // Clear loading message
                xmlContent.innerHTML = '';
                
                // Generate TOC items
                xmlDataList.forEach((xmlData, index) => {
                    const fileId = `file-${index+1}`;
                    const filename = xmlData.filename;
                    
                    const tocItem = document.createElement('li');
                    const tocLink = document.createElement('a');
                    tocLink.href = `#${fileId}`;
                    tocLink.textContent = filename;
                    tocItem.appendChild(tocLink);
                    tocList.appendChild(tocItem);
                    
                    // Generate table for this XML file
                    const fileSection = createXmlFileSection(xmlData, fileId);
                    xmlContent.appendChild(fileSection);
                });
            })
            .catch(error => {
                xmlContent.innerHTML = `<div class="alert alert-danger">Error processing XML files: ${error.message}</div>`;
            });
    });
    
    function processXmlFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
                    
                    // Check for parsing errors
                    const parserError = xmlDoc.querySelector('parsererror');
                    if (parserError) {
                        throw new Error(`XML parsing error in ${file.name}`);
                    }
                    
                    const root = xmlDoc.documentElement;
                    
                    // Extract namespace if present
                    let namespace = "";
                    const nsMatch = root.tagName.match(/^(.+):/);
                    if (nsMatch) {
                        namespace = nsMatch[1];
                    }
                    
                    // Process elements - get children of root
                    const elements = Array.from(root.children).map(child => processElement(child));
                    
                    resolve({
                        filename: file.name,
                        root_tag: root.tagName,
                        namespace: namespace,
                        elements: elements
                    });
                } catch (error) {
                    resolve({
                        filename: file.name,
                        root_tag: "ERROR",
                        namespace: "",
                        elements: [{
                            name: "Error",
                            value: error.message,
                            attributes: {},
                            children: []
                        }]
                    });
                }
            };
            
            reader.onerror = function() {
                reject(new Error(`Failed to read file: ${file.name}`));
            };
            
            reader.readAsText(file);
        });
    }
    
    function processElement(element, parentPath = "") {
        // Extract tag name
        let tagName = element.tagName;
        const nsMatch = tagName.match(/^(.+):(.+)$/);
        if (nsMatch) {
            tagName = nsMatch[2]; // Use local name without namespace prefix
        }
        
        // Create current path
        const currentPath = parentPath ? `${parentPath}/${tagName}` : tagName;
        
        // Get element text, handling whitespace
        const text = element.textContent.trim();
        
        // Process children
        const children = Array.from(element.children).map(child =>
            processElement(child, currentPath)
        );
        
        // Process attributes
        const attributes = {};
        Array.from(element.attributes).forEach(attr => {
            attributes[attr.name] = attr.value;
        });
        
        return {
            name: tagName,
            path: currentPath,
            value: text,
            attributes: attributes,
            children: children
        };
    }
    
    function flattenXmlStructure(elements, rootName = "", parentPath = "") {
        let flattened = [];
        
        elements.forEach(element => {
            // Create the current path, using rootName as the parent for top-level elements
            const currentPath = parentPath
                ? `${parentPath}/${element.name}`
                : (rootName ? `${rootName}/${element.name}` : element.name);
            
            // Add current element
            flattened.push({
                path: currentPath,
                name: element.name,
                value: element.value,
                attributes: element.attributes
            });
            
            // Add children recursively
            if (element.children && element.children.length > 0) {
                const childElements = flattenXmlStructure(element.children, "", currentPath);
                flattened = flattened.concat(childElements);
            }
        });
        
        return flattened;
    }
    
    function createXmlFileSection(xmlData, fileId) {
        const section = document.createElement('div');
        section.id = fileId;
        section.className = 'xml-file-section';
        
        // Add heading
        const heading = document.createElement('h2');
        heading.textContent = xmlData.filename;
        section.appendChild(heading);
        
        // Add root element info
        const rootInfo = document.createElement('p');
        rootInfo.innerHTML = `Root Element: <code>${xmlData.root_tag}</code>`;
        section.appendChild(rootInfo);
        
        // Create table container
        const tableResponsive = document.createElement('div');
        tableResponsive.className = 'table-responsive';
        
        // Create table
        const table = document.createElement('table');
        table.className = 'table table-striped table-bordered';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const headers = ['Path', 'Element', 'Value'];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Extract the root element name for the settings
        const rootElementName = xmlData.root_tag.includes(':')
            ? xmlData.root_tag.split(':')[1]
            : xmlData.root_tag;
            
        // Flatten the XML structure for table representation, but skip the root element in the display
        // since it's already shown in the "Root Element" info above the table
        const flattened = flattenXmlStructure(xmlData.elements, rootElementName);
        
        // Generate table rows
        flattened.forEach(element => {
            const row = document.createElement('tr');
            
            // Path cell
            const pathCell = document.createElement('td');
            pathCell.textContent = element.path;
            row.appendChild(pathCell);
            
            // Element cell (with attributes)
            const nameCell = document.createElement('td');
            nameCell.textContent = element.name;
            
            // Add attributes as badges
            if (Object.keys(element.attributes).length > 0) {
                Object.entries(element.attributes).forEach(([attrName, attrValue]) => {
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-secondary ms-1';
                    badge.textContent = `${attrName}="${attrValue}"`;
                    nameCell.appendChild(badge);
                });
            }
            
            row.appendChild(nameCell);
            
            // Value cell
            const valueCell = document.createElement('td');
            valueCell.textContent = element.value;
            row.appendChild(valueCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableResponsive.appendChild(table);
        section.appendChild(tableResponsive);
        
        // Add "Back to Top" button
        const backToTopContainer = document.createElement('div');
        backToTopContainer.className = 'text-end';
        
        const backToTopLink = document.createElement('a');
        backToTopLink.href = '#top';
        backToTopLink.className = 'btn btn-sm btn-outline-secondary';
        backToTopLink.textContent = 'Back to Top';
        
        backToTopContainer.appendChild(backToTopLink);
        section.appendChild(backToTopContainer);
        
        return section;
    }
});
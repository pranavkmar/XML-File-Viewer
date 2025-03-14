document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const tocContainer = document.getElementById('tocContainer');
    const tocList = document.getElementById('tocList');
    const fileCountSpan = document.getElementById('fileCount');
    const xmlContent = document.getElementById('xmlContent');
    const timestampElement = document.getElementById('timestamp');
    
    // Update timestamp
    const now = new Date();
    timestampElement.textContent = `Generated on ${now.toLocaleString()}`;
    
    // Set up TOC toggle functionality
    const tocToggle = document.getElementById('tocToggle');
    if (tocToggle) {
        tocToggle.addEventListener('click', function() {
            const toc = document.getElementById('tocContainer');
            toc.classList.toggle('collapsed');
            tocToggle.textContent = toc.classList.contains('collapsed') ? 'Expand' : 'Collapse';
        });
        
        // Auto-collapse TOC when scrolling down
        let lastScrollTop = 0;
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down
                tocContainer.classList.add('collapsed');
                tocToggle.textContent = 'Expand';
            } else if (scrollTop < 50) {
                // Scrolling to top
                tocContainer.classList.remove('collapsed');
                tocToggle.textContent = 'Collapse';
            }
            lastScrollTop = scrollTop;
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
        tocContainer.classList.remove('d-none');
        
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
            tocContainer.classList.add('d-none');
            xmlContent.innerHTML = '';
            return;
        }
        
        // Show loading message
        xmlContent.innerHTML = '<div class="alert alert-info">Processing XML files...</div>';
        
        // Reset the TOC and content
        tocList.innerHTML = '';
        fileCountSpan.textContent = `(${files.length} files)`;
        tocContainer.classList.remove('d-none');
        
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
    
    function flattenXmlStructure(elements, parentPath = "") {
        let flattened = [];
        
        elements.forEach(element => {
            const currentPath = parentPath ? `${parentPath}/${element.name}` : element.name;
            
            // Add current element
            flattened.push({
                path: currentPath,
                name: element.name,
                value: element.value,
                attributes: element.attributes
            });
            
            // Add children recursively
            if (element.children && element.children.length > 0) {
                const childElements = flattenXmlStructure(element.children, currentPath);
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
        
        // Flatten the XML structure for table representation
        const flattened = flattenXmlStructure([{
            name: xmlData.root_tag,
            value: "",
            attributes: {},
            children: xmlData.elements
        }]);
        
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
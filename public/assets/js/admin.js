document.addEventListener('DOMContentLoaded', () => {
    // --- TABS & VIEWS ---
    const createTabBtn = document.getElementById('create-tab-btn');
    const findTabBtn = document.getElementById('find-tab-btn');
    const bulkAddTabBtn = document.getElementById('bulk-add-tab-btn');
    const createView = document.getElementById('create-view');
    const findView = document.getElementById('find-view');
    const bulkAddView = document.getElementById('bulk-add-view');

    // --- PAGE HEADER ---
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    
    // --- CREATE FORM ---
    const generateForm = document.getElementById('generate-form');
    const roleSelect = document.getElementById('role-select');
    const otherRoleGroup = document.getElementById('other-role-group');
    const otherRoleInput = document.getElementById('other-role-input');
    
    // --- FIND FORM & RESULT ---
    const findForm = document.getElementById('find-form');
    const findControlNoInput = document.getElementById('find-control-no-input');
    const findResultContainer = document.getElementById('find-result-container');
    const foundRecipientNameEl = document.getElementById('found-recipient-name');
    const generatedQrCodeImg = document.getElementById('generated-qr-code');
    const generatedControlNumberEl = document.getElementById('generated-control-number');
    const saveQrBtn = document.getElementById('save-qr-btn');
    const copyQrImageBtn = document.getElementById('copy-qr-image-btn');
    const copyControlNoBtn = document.getElementById('copy-control-no-btn');
    let latestGeneratedData = null;

    // --- BULK FORM ---
    const bulkDataInput = document.getElementById('bulk-data-input');
    const previewBulkBtn = document.getElementById('preview-bulk-btn');
    const processBulkBtn = document.getElementById('process-bulk-btn');
    const bulkPreviewArea = document.getElementById('bulk-preview-area');
    let parsedBulkData = [];

    let API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? 'http://localhost:3001/api' 
        : '/api';

    // --- TAB MANAGEMENT ---
    const setActiveTab = (activeTab) => {
        [createTabBtn, findTabBtn, bulkAddTabBtn].forEach(btn => btn.classList.remove('active'));
        [createView, findView, bulkAddView].forEach(view => view.classList.add('hidden'));

        if (activeTab === 'create') {
            createTabBtn.classList.add('active');
            createView.classList.remove('hidden');
            pageTitle.textContent = 'Create Certificate';
            pageSubtitle.textContent = 'Fill in the details for a single certificate.';
        } else if (activeTab === 'find') {
            findTabBtn.classList.add('active');
            findView.classList.remove('hidden');
            pageTitle.textContent = 'Find Existing Certificate';
            pageSubtitle.textContent = 'Enter a control number to view its details and re-generate its QR code.';
        } else if (activeTab === 'bulk') {
            bulkAddTabBtn.classList.add('active');
            bulkAddView.classList.remove('hidden');
            pageTitle.textContent = 'Bulk Add Certificates';
            pageSubtitle.textContent = 'Create multiple certificates by pasting data from a spreadsheet.';
        }
    };

    createTabBtn.addEventListener('click', () => setActiveTab('create'));
    findTabBtn.addEventListener('click', () => setActiveTab('find'));
    bulkAddTabBtn.addEventListener('click', () => setActiveTab('bulk'));

    // --- "CREATE" TAB LOGIC ---
    roleSelect.addEventListener('change', () => {
        otherRoleGroup.classList.toggle('hidden', roleSelect.value !== 'Other');
        otherRoleInput.required = roleSelect.value === 'Other';
    });

    generateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Logic remains the same...
        let roleValue = roleSelect.value === 'Other' ? otherRoleInput.value.trim() : roleSelect.value;
        if (roleSelect.value === 'Other' && !roleValue) {
            alert('Please specify the role.');
            return;
        }
        
        const certificateData = {
            encoder_email: document.getElementById('encoder-email').value.trim(),
            encoder_name: document.getElementById('encoder-name').value.trim(),
            recipient_name: document.getElementById('recipient-name').value.trim(),
            certificate_type: document.getElementById('certificate-type').value,
            role: roleValue,
            event_name: document.getElementById('event-name').value.trim(),
            venue: document.getElementById('venue').value.trim(),
            theme: document.getElementById('theme').value.trim(),
            date_given: document.getElementById('date-given').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/generate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(certificateData),
            });
            if (response.ok) {
                const resultData = await response.json();
                alert(`Certificate generated successfully!\nControl Number: ${resultData.control_number}`);
                generateForm.reset();
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Could not connect to the server.');
        }
    });

    // --- "FIND EXISTING" TAB LOGIC (REWRITTEN) ---
    const displayFoundResult = async (certData) => {
        try {
            const qrCodeUrl = await QRCode.toDataURL(certData.control_number, { width: 200 });
            latestGeneratedData = { control_number: certData.control_number, qr_code_url: qrCodeUrl };
            
            foundRecipientNameEl.textContent = certData.recipient_name;
            generatedQrCodeImg.src = qrCodeUrl;
            generatedControlNumberEl.textContent = `Certificate ID: ${certData.control_number}`;
            findResultContainer.classList.remove('hidden');
        } catch (err) {
            console.error('QR generation error:', err);
            alert('Could not generate QR code.');
        }
    };
    
    findForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const controlNo = findControlNoInput.value.trim();
        if (!controlNo) return;

        try {
            const response = await fetch(`${API_BASE_URL}/verify/${controlNo}`);
            if (response.ok) {
                const certData = await response.json();
                await displayFoundResult(certData);
            } else {
                alert('Certificate with that control number was not found.');
                findResultContainer.classList.add('hidden');
            }
        } catch (error) {
            alert('Error connecting to the server.');
        }
    });

    saveQrBtn.addEventListener('click', () => {
        if (!latestGeneratedData) return;
        const link = document.createElement('a');
        link.href = latestGeneratedData.qr_code_url;
        link.download = `qr-code-${latestGeneratedData.control_number}.png`;
        link.click();
    });
    
    copyQrImageBtn.addEventListener('click', async () => {
        if (!latestGeneratedData) return;
        try {
            const response = await fetch(latestGeneratedData.qr_code_url);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            alert('QR Code image copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy image: ', err);
            alert('Failed to copy QR image. This feature may not be supported by your browser.');
        }
    });

    copyControlNoBtn.addEventListener('click', () => {
        if (!latestGeneratedData) return;
        navigator.clipboard.writeText(latestGeneratedData.control_number).then(() => {
            alert('Control number copied!');
        });
    });

    // --- "BULK ADD" TAB LOGIC (UNCHANGED) ---
    previewBulkBtn.addEventListener('click', () => {
        // Logic remains the same...
        const textData = bulkDataInput.value.trim();
        
        if (!textData) {
            bulkPreviewArea.innerHTML = `<p class="card-subtitle">Text area is empty. Paste data to preview.</p>`;
            return;
        }
        
        const rows = textData.split('\n').filter(row => row.trim() !== '');
        let validCount = 0;
        let errorCount = 0;
        let tableRowsHTML = '';

        parsedBulkData = rows.map(row => {
            const columns = row.split('\t');
            if (columns.length !== 11) {
                errorCount++;
                tableRowsHTML += `<tr class="error-row"><td colspan="3">Error: Row does not have 11 columns.</td></tr>`;
                return null;
            }
            validCount++;
            const cert = {
                recipient_name: columns[3].trim(),
                event_name: columns[4].trim(),
                control_number: columns[10].trim(),
                full_data: {
                    timestamp: columns[0].trim(), encoder_email: columns[1].trim(), encoder_name: columns[2].trim(),
                    recipient_name: columns[3].trim(), event_name: columns[4].trim(), certificate_type: columns[5].trim(),
                    role: columns[6].trim(), venue: columns[7].trim(), theme: columns[8].trim(),
                    date_given: columns[9].trim(), control_number: columns[10].trim()
                }
            };
            tableRowsHTML += `<tr><td>${cert.recipient_name}</td><td>${cert.event_name}</td><td>${cert.control_number}</td></tr>`;
            return cert;
        }).filter(cert => cert !== null);
        
        const finalPreviewHTML = `
            <div class="card-header-icon">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 <h3>Bulk Import Preview</h3>
            </div>
            <p class="preview-summary">
                <span class="summary-valid">${validCount} valid rows</span> / 
                <span class="summary-invalid">${errorCount} error rows</span>
            </p>
            <div class="preview-table-wrapper">
                <table class="preview-table">
                    <thead><tr><th>Recipient</th><th>Event</th><th>Control Number</th></tr></thead>
                    <tbody>${tableRowsHTML}</tbody>
                </table>
            </div>
        `;
        
        bulkPreviewArea.innerHTML = finalPreviewHTML;
        processBulkBtn.disabled = !(validCount > 0 && errorCount === 0);
    });

    processBulkBtn.addEventListener('click', async () => {
        // Logic remains the same...
        if (parsedBulkData.length === 0) return;

        processBulkBtn.disabled = true;
        previewBulkBtn.disabled = true;
        
        let progressHTML = `
            <div id="bulk-progress-container" style="margin-top: 1rem;">
                <p id="bulk-status"></p>
                <div class="progress-bar-container"><div class="progress-bar-slider"></div></div>
            </div>`;
        bulkPreviewArea.insertAdjacentHTML('beforeend', progressHTML);
        const bulkStatus = document.getElementById('bulk-status');
        const progressBarSlider = bulkPreviewArea.querySelector('.progress-bar-slider');

        let successfulCount = 0;
        let failedCount = 0;

        for (let i = 0; i < parsedBulkData.length; i++) {
            const certData = parsedBulkData[i].full_data;
            bulkStatus.textContent = `Processing ${i + 1} of ${parsedBulkData.length}...`;
            try {
                const response = await fetch(`${API_BASE_URL}/generate`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(certData),
                });
                if (response.ok) successfulCount++;
                else failedCount++;
            } catch (error) {
                failedCount++;
            }
            progressBarSlider.style.width = `${((i + 1) / parsedBulkData.length) * 100}%`;
        }

        let statusMessage = `Finished! ${successfulCount} added successfully.`;
        if (failedCount > 0) statusMessage += ` ${failedCount} failed. Check console for details.`;
        bulkStatus.textContent = statusMessage;
        
        bulkDataInput.value = '';
        previewBulkBtn.disabled = false;
        parsedBulkData = [];
    });

    // --- INITIALIZE ---
    setActiveTab('create');
});
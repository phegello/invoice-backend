require('dotenv').config();

const express = require('express');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Your backend is running!');
});

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://phegello.github.io');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Configure Nodemailer with your email service provider credentials
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Helper function to generate the PDF invoice from HTML
const generatePdf = async (invoiceData) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // --- NEW HTML CONTENT ---
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        font-size: 10px;
                    }
                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 20mm;
                        box-sizing: border-box;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #ccc;
                        padding-bottom: 10px;
                    }
                    .logo {
                        width: 80px;
                        height: auto;
                        margin-right: 15px;
                    }
                    .company-info {
                        flex-grow: 1;
                    }
                    .company-info h1 {
                        margin: 0;
                        font-size: 16px;
                        color: #004d99;
                    }
                    .company-info p {
                        margin: 0;
                        font-size: 10px;
                        color: #555;
                    }
                    .section-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                    }
                    .section-table th, .section-table td {
                        border: 1px solid #ccc;
                        padding: 6px 8px;
                        text-align: left;
                    }
                    .section-table th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                        color: #333;
                    }
                    .bill-to-table {
                        width: 40%;
                        float: right;
                        margin-bottom: 20px;
                    }
                    .bill-to-table td {
                        font-size: 10px;
                        padding: 4px 6px;
                        border: none;
                    }
                    .bill-to-table .label {
                        font-weight: bold;
                        width: 80px;
                    }
                    .itemized-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    .itemized-table th, .itemized-table td {
                        border: 1px solid #ccc;
                        padding: 6px 8px;
                        text-align: left;
                        font-size: 10px;
                    }
                    .itemized-table th {
                        background-color: #004d99;
                        color: white;
                        font-weight: normal;
                    }
                    .itemized-table td:nth-child(4), .itemized-table td:nth-child(5) {
                        text-align: right;
                    }
                    .itemized-table td:nth-child(2) {
                        text-align: center;
                    }
                    .itemized-table .total-row {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .summary-table {
                        width: 30%;
                        float: right;
                        margin-top: 20px;
                        border: 1px solid #ccc;
                        border-collapse: collapse;
                    }
                    .summary-table td {
                        padding: 5px 8px;
                        border: none;
                        font-size: 10px;
                    }
                    .summary-table .label {
                        font-weight: bold;
                        width: 60%;
                        text-align: left;
                    }
                    .summary-table .value {
                        text-align: right;
                    }
                    .summary-table .grand-total {
                        background-color: #004d99;
                        color: white;
                        font-weight: bold;
                    }
                    .summary-table .grand-total .value {
                        font-size: 12px;
                    }
                    .banking-details-table {
                        width: 40%;
                        margin-top: 20px;
                        border: 1px solid #ccc;
                        border-collapse: collapse;
                        clear: both;
                    }
                    .banking-details-table th, .banking-details-table td {
                        border: 1px solid #ccc;
                        padding: 5px 8px;
                        text-align: left;
                        font-size: 10px;
                    }
                    .banking-details-table th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .terms-conditions {
                        margin-top: 30px;
                        font-size: 9px;
                        page-break-before: auto;
                    }
                    .terms-conditions h4 {
                        margin-bottom: 5px;
                        color: #004d99;
                    }
                    .terms-conditions ul {
                        list-style-type: disc;
                        padding-left: 15px;
                        margin-top: 5px;
                    }
                    .terms-conditions ul li {
                        margin-bottom: 3px;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 10px;
                        border-top: 1px solid #eee;
                        font-size: 9px;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="${invoiceData.logoUrl || 'https://via.placeholder.com/80x80?text=LOGO'}" alt="Company Logo" class="logo">
                        <div class="company-info">
                            <h1>NT BUSINESS SOLUTIONS (Pty) Ltd</h1>
                            <p>Experience Full Thrust!</p>
                        </div>
                    </div>

                    <table class="bill-to-table">
                        <tr>
                            <td class="label">Business Name:</td>
                            <td>${invoiceData.businessName || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="label">Invoice No:</td>
                            <td>${invoiceData.invoiceNumber || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td class="label">Client Name:</td>
                            <td>${invoiceData.clientName || 'N/A'}</td>
                        </tr>
                    </table>
                    <div style="clear: both;"></div> 

                    <h2 style="font-size: 14px; color: #004d99; margin-top: 30px;">BILLING</h2>
                    <table class="itemized-table">
                        <thead>
                            <tr>
                                <th>Qty.</th>
                                <th>Item</th>
                                <th>Unit price</th>
                                <th>Discount</th>
                                <th>Unit total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceData.items.map(item => `
                                <tr>
                                    <td>${item.quantity}</td>
                                    <td>${item.description}</td>
                                    <td>R ${(item.price).toFixed(2)}</td>
                                    <td>R ${(item.itemDiscount || 0).toFixed(2)}</td> 
                                    <td>R ${(item.price * item.quantity - (item.itemDiscount || 0)).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
                            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
                        </tbody>
                    </table>

                    <table class="summary-table">
                        <tr><td class="label">SUB-TOTAL:</td><td class="value">R ${invoiceData.subtotal.toFixed(2)}</td></tr>
                        <tr><td class="label">DISCOUNT:</td><td class="value">R ${invoiceData.discount.toFixed(2)}</td></tr>
                        <tr><td class="label">VAT:</td><td class="value">R ${(invoiceData.vat || 0).toFixed(2)}</td></tr>
                        <tr><td class="label">POST:</td><td class="value">R ${(invoiceData.post || 0).toFixed(2)}</td></tr>
                        <tr class="grand-total"><td class="label">TOTAL DUE:</td><td class="value">R ${invoiceData.total.toFixed(2)}</td></tr>
                    </table>
                    <div style="clear: both;"></div> 

                    <table class="banking-details-table">
                        <thead>
                            <tr><th colspan="2">BANKING DETAILS</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Bank:</td><td>FNB</td></tr>
                            <tr><td>Account Number:</td><td>63005576410</td></tr>
                            <tr><td>Business Name:</td><td>NT BUSINESS SOLUTIONS (Pty) Ltd</td></tr>
                            <tr><td>Branch Code:</td><td>250655</td></tr>
                        </tbody>
                    </table>

                    <div class="terms-conditions">
                        <h4>Terms and Conditions</h4>
                        <ul>
                            <li>We will invoice the full project fee at the time that the job is contracted, with the first 50% of the fee due in advance of commencement of work, and the balance due on the completion of the task.</li>
                            <li>We do not take cash. Please use EFT only.</li>
                            <li>Please no ATM Cash Deposit.</li>
                            <li>For EFT do immediate payment only.</li>
                        </ul>
                    </div>

                    <div class="footer">
                        <p><strong>NT BUSINESS SOLUTIONS (Pty) Ltd</strong></p>
                        <p>94 Hans Van Rensburg Polokwane 0700 | www.ntbusiness.co.za</p>
                        <p>Cell: 079 169 0775 | Tel: 015 296 0986 | admin@ntbusiness.co.za</p>
                        <p>*** Thank you for your business! ***</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4' });

        return pdfBuffer;

    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// API endpoint to create and send the invoice
app.post('/api/create-invoice', async (req, res) => {
    const invoiceData = req.body;

    try {
        const pdfBuffer = await generatePdf(invoiceData);

        const clientMailOptions = {
            from: process.env.GMAIL_USER,
            to: invoiceData.clientEmail,
            subject: `Invoice #${invoiceData.invoiceNumber} from NT Business Solutions`,
            html: `<p>Dear ${invoiceData.clientName},</p><p>Please find attached your invoice for our services.</p><p>Total Amount Due: R${invoiceData.total.toFixed(2)}</p><p>Thank you for your business!</p>`,
            attachments: [
                {
                    filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        const userMailOptions = {
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            subject: `Copy of Invoice #${invoiceData.invoiceNumber} sent to ${invoiceData.clientName}`,
            html: `<p>A copy of the invoice has been sent to the client.</p>`,
            attachments: [
                {
                    filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(clientMailOptions);
        await transporter.sendMail(userMailOptions);

        res.status(200).json({ message: 'Invoice created and sent successfully!' });

    } catch (error) {
        console.error('Error creating or sending invoice:', error);
        res.status(500).json({ error: 'Failed to create and send invoice.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
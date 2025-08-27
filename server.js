require('dotenv').config();

const express = require('express');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
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
    // Fix for self-signed certificate in certificate chain error
    tls: {
        rejectUnauthorized: false
    }
});

// Helper function to generate the PDF invoice from HTML
const generatePdf = async (invoiceData) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #004d99;">Invoice</h1>
            <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
            <p><strong>Date:</strong> ${invoiceData.invoiceDate}</p>
            <hr />
            <p><strong>Client:</strong> ${invoiceData.clientName}</p>
            <p><strong>Email:</strong> ${invoiceData.clientEmail}</p>
            <br />
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="padding: 10px; border: 1px solid #ddd;">Description</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Qty</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Price</th>
                        <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoiceData.items.map(item => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;">${item.description}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">${item.quantity}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">R ${(item.price).toFixed(2)}</td>
                            <td style="padding: 10px; border: 1px solid #ddd;">R ${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <br />
            <div style="text-align: right;">
                <p><strong>Subtotal:</strong> R ${invoiceData.subtotal.toFixed(2)}</p>
                <p><strong>Discount:</strong> R ${invoiceData.discount.toFixed(2)}</p>
                <h3 style="color: #004d99;">Total: R ${invoiceData.total.toFixed(2)}</h3>
            </div>
            <p style="margin-top: 50px;">Thank you for your business!</p>
        </div>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    return pdfBuffer;
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
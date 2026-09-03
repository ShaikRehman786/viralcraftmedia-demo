import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
// We will use the native global fetch API in Node.js instead of external packages

let cachedRegularBase64 = null;
let cachedMediumBase64 = null;
let cachedLogoBase64 = null;

function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'public', 'logoooooooooo.png'),
      path.resolve(process.cwd(), '..', 'public', 'logoooooooooo.png'),
      path.resolve('public', 'logoooooooooo.png'),
      path.resolve('dist', 'logoooooooooo.png')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        cachedLogoBase64 = `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
        return cachedLogoBase64;
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

async function loadFonts() {
  if (cachedRegularBase64 && cachedMediumBase64) {
    return { regular: cachedRegularBase64, medium: cachedMediumBase64 };
  }

  try {
    const [resReg, resMed] = await Promise.all([
      fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf'),
      fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf')
    ]);

    if (resReg.ok && resMed.ok) {
      const [bufReg, bufMed] = await Promise.all([
        resReg.arrayBuffer(),
        resMed.arrayBuffer()
      ]);

      cachedRegularBase64 = Buffer.from(bufReg).toString('base64');
      cachedMediumBase64 = Buffer.from(bufMed).toString('base64');
    }
  } catch (err) {
    // Fonts load error
  }

  return { regular: cachedRegularBase64, medium: cachedMediumBase64 };
}

export async function generateInvoicePdf({
  orderId,
  invoiceNumber,
  paymentId,
  orderDate,
  name,
  contact,
  email,
  service,
  platform,
  clipCount,
  duration,
  instructions,
  amount,
  razorpayOrderId,
  language
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const fonts = await loadFonts();
  const fontLoaded = !!(fonts.regular && fonts.medium);

  if (fontLoaded) {
    doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Medium.ttf', fonts.medium);
    doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
    doc.setFont('Roboto', 'normal');
  } else {
    doc.setFont('helvetica', 'normal');
  }

  const currencySymbol = fontLoaded ? '₹' : 'INR ';

  // Invoice Header & Logo Drawing with official VCM current website logo (same asset as Navbar/Sidebar)
  const logoData = getLogoBase64();
  if (logoData) {
    try {
      const props = doc.getImageProperties(logoData);
      const maxW = 42;
      const maxH = 12;
      let w = maxW;
      let h = (props.height * w) / props.width;
      if (h > maxH) {
        h = maxH;
        w = (props.width * h) / props.height;
      }
      // Vertically center within 12mm header band, preserve aspect (no stretch)
      const yOffset = 12 + (maxH - h) / 2;
      doc.addImage(logoData, 'PNG', 15, yOffset, w, h);
    } catch (e) {
      doc.setFontSize(18);
      doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
      doc.setTextColor(255, 106, 0); // brand color #FF6A00
      doc.text("Viral Craft Media", 15, 22);
    }
  } else {
    doc.setFontSize(18);
    doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
    doc.setTextColor(255, 106, 0); // brand color #FF6A00
    doc.text("Viral Craft Media", 15, 22);
  }

  doc.setFontSize(8);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text("PREMIUM VIDEO CLIPPING SERVICE", 15, 28);

  doc.setFontSize(22);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text("INVOICE", 195, 22, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  
  doc.text(`Invoice #: ${invoiceNumber}`, 195, 29, { align: 'right' });
  doc.text(`Order ID: ${orderId}`, 195, 34, { align: 'right' });
  doc.text(`Payment ID: ${paymentId}`, 195, 39, { align: 'right' });
  doc.text(`Date: ${orderDate}`, 195, 44, { align: 'right' });

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // green #10B981
  doc.text("Status: Paid", 195, 49, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(15, 54, 195, 54);

  // FROM Section
  doc.setFontSize(8);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setTextColor(107, 114, 128);
  doc.text("FROM:", 15, 61);
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text("Viral Craft Media", 15, 66);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text("Hyderabad, Telangana, India", 15, 71);
  doc.text("contact@viralcraftmedia.com", 15, 76);

  // BILLED TO Section
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("BILLED TO:", 115, 61);
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text(name, 115, 66);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Phone: ${contact}`, 115, 71);
  doc.text(`Email: ${email || 'N/A'}`, 115, 76);

  // Divider Line
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 93, 195, 93);

  // Table
  doc.setFillColor(31, 41, 55);
  doc.rect(15, 98, 180, 8, "F");

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Description", 20, 103.5);
  doc.text("Platform", 100, 103.5);
  doc.text("Clips", 140, 103.5, { align: 'center' });
  doc.text("Amount", 190, 103.5, { align: 'right' });

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(service || "Premium Video Clipping", 20, 112);

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text(`${clipCount} clip(s) delivered to Drive`, 20, 116);

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(platform || 'Instagram', 100, 112);
  doc.text(String(clipCount), 140, 112, { align: 'center' });
  doc.text(`${currencySymbol}${amount}`, 190, 112, { align: 'right' });

  doc.setDrawColor(243, 244, 246);
  doc.line(15, 121, 195, 121);

  // Summary and Totals
  doc.text("Subtotal:", 160, 136, { align: 'right' });
  doc.text(`${currencySymbol}${amount}`, 190, 136, { align: 'right' });
  doc.text("GST (0%):", 160, 141, { align: 'right' });
  doc.text(`${currencySymbol}0`, 190, 141, { align: 'right' });

  doc.setDrawColor(255, 106, 0);
  doc.line(140, 147, 195, 147);

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 106, 0);
  doc.text("Grand Total:", 160, 153, { align: 'right' });
  doc.text(`${currencySymbol}${amount}`, 190, 153, { align: 'right' });

  // Brief instructions
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text("PROJECT BRIEF & EDITING INSTRUCTIONS", 15, 163);

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  const wrappedInstructions = doc.splitTextToSize(instructions || "No custom instructions provided.", 170);
  const textHeight = (wrappedInstructions.length * 4.2) + 6;
  const boxHeight = Math.max(textHeight, 20);

  doc.rect(15, 167, 180, boxHeight, "DF");
  doc.text(wrappedInstructions, 20, 172);

  // Footer
  doc.setDrawColor(229, 231, 235);
  doc.line(15, 245, 195, 245);

  doc.setFont(fontLoaded ? 'Roboto' : 'helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 106, 0);
  doc.text("Thank you for choosing Viral Craft Media.", 15, 251);

  const arrayBuffer = doc.output('arraybuffer');
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  return { buffer, base64 };
}

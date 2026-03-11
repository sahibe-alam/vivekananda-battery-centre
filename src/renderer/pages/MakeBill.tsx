import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ItemMaster, Stock, Profile } from '@shared/types';
import jsPDF from 'jspdf';
import './MakeBill.css';

interface Props {
  companyId: string;
}

interface BillItem {
  model: string;
  type: string;
  serialNumbers: string[];
  quantity: number;
  rate: number;
  cgstPercent: number;
  sgstPercent: number;
}

interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  gstNumber: string;
}

interface InvoiceDetails {
  invoiceTitle: string;
  invoiceCopyLabel: string;
  invoiceDate: string;
  deliveryNote: string;
  modeTermsOfPayment: string;
  suppliersRef: string;
  otherReferences: string;
  buyersOrderNo: string;
  buyersOrderDate: string;
  dispatchDocNo: string;
  deliveryNoteDate: string;
  dispatchedThrough: string;
  destination: string;
  termsOfDelivery: string;
  buyerHeading: string;
  hsnSac: string;
  sfCode: string;
  perUnit: string;
  outputCgstLabel: string;
  outputSgstLabel: string;
  roundOffLabel: string;
  bankName: string;
  accountNumber: string;
  branchIfsc: string;
  declarationLine1: string;
  declarationLine2: string;
  jurisdictionText: string;
  computerGeneratedText: string;
}

const INITIAL_BILL_ITEM: BillItem = {
  model: '',
  type: '',
  serialNumbers: ['', '', '', ''],
  quantity: 0,
  rate: 0,
  cgstPercent: 9,
  sgstPercent: 9,
};

const INITIAL_CUSTOMER_DETAILS: CustomerDetails = {
  name: '',
  phone: '',
  address: '',
  gstNumber: '',
};

const createInitialInvoiceDetails = (profile?: Profile | null): InvoiceDetails => ({
  invoiceTitle: 'GST Tax Invoice',
  invoiceCopyLabel: '(Duplicate)',
  invoiceDate: new Date().toISOString().split('T')[0],
  deliveryNote: '',
  modeTermsOfPayment: '',
  suppliersRef: '',
  otherReferences: '',
  buyersOrderNo: '',
  buyersOrderDate: '',
  dispatchDocNo: '',
  deliveryNoteDate: '',
  dispatchedThrough: '',
  destination: '',
  termsOfDelivery: '',
  buyerHeading: 'Buyer (if other than consignee)',
  hsnSac: '8507',
  sfCode: 'SF',
  perUnit: 'PCs',
  outputCgstLabel: 'OUTPUT CGST',
  outputSgstLabel: 'OUTPUT SGST',
  roundOffLabel: 'ROUND OFF',
  bankName: profile?.bankDetail?.bankName?.trim() || 'BANK OF INDIA',
  accountNumber: profile?.bankDetail?.accountNumber?.trim() || '428120110000218',
  branchIfsc: `${profile?.bankDetail?.branch?.trim() || 'BALLY BAZAR'} & ${
    profile?.bankDetail?.ifscCode?.trim() || 'BKID0004281'
  }`,
  declarationLine1: 'We declare that this invoice shows the actual price of the goods',
  declarationLine2: 'described and that all particulars are true and correct.',
  jurisdictionText: 'SUBJECT TO HOWRAH JURISDICTION',
  computerGeneratedText: 'This is a Computer Generated Invoice',
});

const MakeBill: React.FC<Props> = ({ companyId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showBillDetailsModal, setShowBillDetailsModal] = useState(true);
  const [billItem, setBillItem] = useState<BillItem>(INITIAL_BILL_ITEM);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(INITIAL_CUSTOMER_DETAILS);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails>(createInitialInvoiceDetails());
  const [roundOff, setRoundOff] = useState(0);
  const [savedBill, setSavedBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, stockData, profileData] = await Promise.all([
        window.electronAPI.getItems({ companyId }),
        window.electronAPI.getStock({ companyId }),
        window.electronAPI.getProfile(),
      ]);
      setItems(itemsData);
      setStock(stockData);
      setProfile(profileData);
      setInvoiceDetails((prev) => {
        const defaults = createInitialInvoiceDetails(profileData);
        return {
          ...defaults,
          ...prev,
          bankName: prev.bankName || defaults.bankName,
          accountNumber: prev.accountNumber || defaults.accountNumber,
          branchIfsc: prev.branchIfsc || defaults.branchIfsc,
        };
      });
      console.log('Data loaded:', { items: itemsData.length, stock: stockData.length, profile: profileData });
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    const selectedItem = items.find((item) => item.id === itemId);
    if (selectedItem) {
      setBillItem({
        ...billItem,
        model: selectedItem.model,
        type: selectedItem.type,
        cgstPercent: selectedItem.cgstPercent,
        sgstPercent: selectedItem.sgstPercent,
      });
    }
  };

  const getAvailableStock = (): number => {
    const stockItem = stock.find(
      (s) => s.model === billItem.model && s.type === billItem.type
    );
    return stockItem?.availableStock || 0;
  };

  const handleSerialNumberChange = (index: number, value: string) => {
    const newSerialNumbers = [...billItem.serialNumbers];
    newSerialNumbers[index] = value;
    setBillItem({ ...billItem, serialNumbers: newSerialNumbers });
  };

  const handleInvoiceDetailChange = <K extends keyof InvoiceDetails>(
    field: K,
    value: InvoiceDetails[K]
  ) => {
    setInvoiceDetails((prev) => ({ ...prev, [field]: value }));
  };

  const calculateAmounts = () => {
    const subtotal = billItem.rate * billItem.quantity;
    const cgstAmount = (subtotal * billItem.cgstPercent) / 100;
    const sgstAmount = (subtotal * billItem.sgstPercent) / 100;
    const totalBeforeRound = subtotal + cgstAmount + sgstAmount;
    const total = totalBeforeRound + roundOff;

    return {
      subtotal: subtotal.toFixed(2),
      cgstAmount: cgstAmount.toFixed(2),
      sgstAmount: sgstAmount.toFixed(2),
      totalGst: (cgstAmount + sgstAmount).toFixed(2),
      total: total.toFixed(2),
    };
  };

  const amounts = calculateAmounts();

  const resetForm = () => {
    setBillItem(INITIAL_BILL_ITEM);
    setCustomerDetails(INITIAL_CUSTOMER_DETAILS);
    setInvoiceDetails(createInitialInvoiceDetails(profile));
    setRoundOff(0);
    setShowItemModal(false);
    setShowBillDetailsModal(false);
    setSavedBill(null);
  };

  const handleSaveBill = async () => {
    if (!customerDetails.name.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (!customerDetails.phone.trim()) {
      alert('Please enter customer phone number');
      return;
    }

    if (!billItem.model || !billItem.type) {
      alert('Please select an item');
      return;
    }

    if (billItem.rate <= 0 || billItem.quantity <= 0) {
      alert('Rate and quantity must be greater than 0');
      return;
    }

    const availableStock = getAvailableStock();
    if (billItem.quantity > availableStock) {
      alert(`Insufficient stock! Available: ${availableStock}`);
      return;
    }

    // Filter out empty serial numbers
    const validSerialNumbers = billItem.serialNumbers
      .filter((sn) => sn.trim() !== '')
      .slice(0, 4);

    // Format client details
    const clientDetailsText = `${customerDetails.name}\nPhone: ${customerDetails.phone}${
      customerDetails.address ? '\n' + customerDetails.address : ''
    }${customerDetails.gstNumber ? '\nGST No: ' + customerDetails.gstNumber : ''}`;

    try {
      const sale = await window.electronAPI.addSale({
        companyId,
        clientDetails: clientDetailsText,
        model: billItem.model,
        type: billItem.type,
        serialNumbers: validSerialNumbers,
        quantity: billItem.quantity,
        rate: billItem.rate,
        cgstPercent: billItem.cgstPercent,
        sgstPercent: billItem.sgstPercent,
        roundOff,
      });

      setSavedBill({
        ...sale,
        clientDetails: clientDetailsText,
        customerDetails,
        profile,
        invoiceDetails,
      });

      alert('Bill saved successfully! Stock updated.');
      setShowBillDetailsModal(false);

      // Reload stock
      await loadData();
    } catch (error) {
      console.error('Failed to save bill:', error);
      alert('Failed to save bill');
    }
  };

  const handlePrint = async () => {
    if (!savedBill) {
      alert('Please save the bill first');
      return;
    }

    const pdf = generatePDF(savedBill);
    const pdfBlob = pdf.output('blob');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <iframe width='100%' height='100%' src='data:application/pdf;base64,${base64}'></iframe>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    };
    reader.readAsDataURL(pdfBlob);
  };

  const handleDownload = () => {
    if (!savedBill) {
      alert('Please save the bill first');
      return;
    }
    generatePDF(savedBill);
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const convertTwoDigit = (n: number): string => {
      if (n < 10) return ones[n];
      if (n >= 10 && n < 20) return teens[n - 10];
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    };
    
    const convertThreeDigit = (n: number): string => {
      if (n === 0) return '';
      if (n < 100) return convertTwoDigit(n);
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertTwoDigit(n % 100) : '');
    };
    
    if (num < 1000) return convertThreeDigit(num);
    if (num < 100000) {
      return convertTwoDigit(Math.floor(num / 1000)) + ' Thousand' + 
             (num % 1000 !== 0 ? ' ' + convertThreeDigit(num % 1000) : '');
    }
    return convertTwoDigit(Math.floor(num / 100000)) + ' Lakh' +
           (num % 100000 !== 0 ? ' ' + convertThreeDigit(num % 100000) : '');
  };

  const generatePDF = (bill: any): jsPDF => {
    const doc = new jsPDF();
    const details: InvoiceDetails = bill.invoiceDetails || invoiceDetails;
    const pageWidth = doc.internal.pageSize.getWidth();
    const lineHeight = 4;
    const toWrappedLines = (value: string, width: number, maxLines?: number): string[] => {
      const lines = doc.splitTextToSize(value || '', width) as string[];
      if (!maxLines || lines.length <= maxLines) {
        return lines;
      }
      const trimmed = lines.slice(0, maxLines);
      const lastLine = trimmed[maxLines - 1];
      trimmed[maxLines - 1] = lastLine.length > 2 ? `${lastLine.slice(0, lastLine.length - 2)}..` : `${lastLine}..`;
      return trimmed;
    };
    let yPos = 15;

    // Header - Dynamic from Profile
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.businessName || 'VIVEKANANDA BATTERY CENTRE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(profile?.address || '267/2/1, G.T.ROAD (N) GHUSURI, HOWRAH 711107', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`MOBILE NO.: ${profile?.phone || '9831978474'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`PANIT NO. : ${profile?.pan || 'AMBPG1309B'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`GST NO. : ${profile?.gstNumber || '19AAMBPG1309B1ZS'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.text(`E-Mail : ${profile?.email || 'vivekanandabatterycentre@gmail.com'}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(details.invoiceTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.setFontSize(10);
    doc.text(details.invoiceCopyLabel, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    const col1X = 15;
    const col2X = 105;
    const col3X = 145;
    
    doc.rect(col1X, yPos, 180, 40);
    doc.line(col2X, yPos, col2X, yPos + 40);
    doc.line(col3X, yPos, col3X, yPos + 40);
    [8, 16, 24, 32].forEach(offset => doc.line(col1X, yPos + offset, 195, yPos + offset));
    doc.setFontSize(8);
    doc.text('Invoice No.', col1X + 2, yPos + 5);
    doc.text(bill.invoiceNumber, col2X + 2, yPos + 5);
    doc.text('Dated', col3X + 2, yPos + 5);
    doc.text(new Date(details.invoiceDate || bill.date).toLocaleDateString(), col3X + 15, yPos + 5);
    doc.text('Delivery Note', col1X + 2, yPos + 13);
    doc.text(details.deliveryNote, col2X + 2, yPos + 13);
    doc.text('Mode/Terms of Payment', col3X + 2, yPos + 13);
    doc.text(details.modeTermsOfPayment, col3X + 42, yPos + 13);
    doc.text("Supplier's Ref.", col1X + 2, yPos + 21);
    doc.text(details.suppliersRef, col2X + 2, yPos + 21);
    doc.text('Other Reference(s)', col3X + 2, yPos + 21);
    doc.text(details.otherReferences, col3X + 42, yPos + 21);
    doc.text("Buyer's Order No", col1X + 2, yPos + 29);
    doc.text(details.buyersOrderNo, col2X + 2, yPos + 29);
    doc.text('Dated', col3X + 2, yPos + 29);
    doc.text(details.buyersOrderDate, col3X + 15, yPos + 29);
    doc.text('Despatched DocumentNo.', col1X + 2, yPos + 37);
    doc.text(details.dispatchDocNo, col2X + 2, yPos + 37);
    doc.text('Delivery Note Date', col3X + 2, yPos + 37);
    doc.text(details.deliveryNoteDate, col3X + 30, yPos + 37);
    yPos += 42;

    doc.rect(col1X, yPos, 180, 16);
    doc.line(col2X, yPos, col2X, yPos + 16);
    doc.line(col3X, yPos, col3X, yPos + 16);
    doc.line(col1X, yPos + 8, 195, yPos + 8);
    doc.text('Despatched through', col1X + 2, yPos + 5);
    doc.text(details.dispatchedThrough, col2X + 2, yPos + 5);
    doc.text('Destination', col3X + 2, yPos + 5);
    doc.text(details.destination, col3X + 22, yPos + 5);
    doc.text('Terms of delivery', col1X + 2, yPos + 13);
    doc.text(details.termsOfDelivery, col2X + 2, yPos + 13);
    yPos += 18;

    doc.rect(col1X, yPos, 180, 25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(details.buyerHeading, col1X + 2, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const clientLines = (bill.clientDetails || '')
      .split('\n')
      .flatMap((line: string) => toWrappedLines(line, 96));
    let clientY = yPos + 10;
    clientLines.forEach((line: string) => {
      if (clientY < yPos + 23) {
        doc.text(line, col1X + 2, clientY);
        clientY += lineHeight;
      }
    });
    yPos += 27;

    const colWidths = [10, 15, 74, 20, 15, 12, 12, 22];
    const descriptionTextWidth = Math.max(32, colWidths[2] - 28);
    const modelLines = toWrappedLines(bill.model || '', descriptionTextWidth, 4);
    const typeLines = toWrappedLines(`Type:- ${bill.type || ''}`, descriptionTextWidth, 3);
    const serialLines = toWrappedLines(`SN:- ${(bill.serialNumbers || []).join(', ')}`, descriptionTextWidth, 6);
    const descriptionLeftLines = [...modelLines, ...typeLines, ...serialLines];
    const itemHeaderHeight = 8;
    const minItemBodyHeight = 42;
    const dynamicItemBodyHeight = Math.max(minItemBodyHeight, 12 + descriptionLeftLines.length * lineHeight);
    const itemTableHeight = itemHeaderHeight + dynamicItemBodyHeight;

    doc.rect(col1X, yPos, 180, itemHeaderHeight);
    let xPos = col1X;
    doc.setFont('helvetica', 'bold');
    ['Sl No.', 'SF', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'Per', 'Amount'].forEach((header, i) => {
      doc.text(header, xPos + 2, yPos + 5);
      xPos += colWidths[i];
      if (i < 7) doc.line(xPos, yPos, xPos, yPos + itemTableHeight);
    });
    yPos += itemHeaderHeight;

    doc.rect(col1X, yPos, 180, dynamicItemBodyHeight);
    doc.setFont('helvetica', 'normal');
    xPos = col1X;
    doc.text('1', xPos + 3, yPos + 5);
    xPos += colWidths[0];
    doc.text(details.sfCode, xPos + 1, yPos + 5);
    xPos += colWidths[1];
    let descY = yPos + 5;
    descriptionLeftLines.forEach((line) => {
      doc.text(line, xPos + 2, descY);
      descY += lineHeight;
    });
    const taxLabelY = Math.max(yPos + 25, descY + 2);
    const taxLabelX = xPos + Math.max(36, colWidths[2] - 30);
    const taxPercentX = xPos + colWidths[2] - 10;
    doc.text(details.outputCgstLabel, taxLabelX, taxLabelY);
    doc.text(bill.cgstPercent + '%', taxPercentX, taxLabelY);
    doc.text(details.outputSgstLabel, taxLabelX, taxLabelY + lineHeight);
    doc.text(bill.sgstPercent + '%', taxPercentX, taxLabelY + lineHeight);
    doc.text(details.roundOffLabel, taxLabelX, taxLabelY + lineHeight * 2);
    
    xPos += colWidths[2];
    doc.text(details.hsnSac, xPos + 2, yPos + 5);
    xPos += colWidths[3];
    doc.text(bill.quantity.toString(), xPos + 2, yPos + 5);
    xPos += colWidths[4];
    
    const baseAmount = bill.quantity * bill.rate;
    doc.text(bill.rate.toFixed(2), xPos + 2, yPos + 5);
    xPos += colWidths[5];
    doc.text(details.perUnit, xPos + 2, yPos + 5);
    xPos += colWidths[6];
    
    const cgstAmount = bill.cgstAmount;
    const sgstAmount = bill.sgstAmount;
    const roundOffAmount = bill.totalAmount - (baseAmount + cgstAmount + sgstAmount);
    const amountColX = col1X + colWidths.slice(0, 7).reduce((sum, width) => sum + width, 0);
    const amountValueRightX = amountColX + colWidths[7] - 1;
    const drawAmountLine = (y: number, value: number): void => {
      doc.text(`INR ${value.toFixed(2)}`, amountValueRightX, y, { align: 'right' });
    };
    const baseAmountY = yPos + 7;
    const cgstAmountY = taxLabelY + 2;
    const sgstAmountY = taxLabelY + lineHeight + 2;
    const roundOffAmountY = taxLabelY + lineHeight * 2 + 2;
    
    drawAmountLine(baseAmountY, baseAmount);
    drawAmountLine(cgstAmountY, cgstAmount);
    drawAmountLine(sgstAmountY, sgstAmount);
    drawAmountLine(roundOffAmountY, roundOffAmount);
    yPos += dynamicItemBodyHeight;

    doc.rect(col1X, yPos, 180, 8);
    doc.setFont('helvetica', 'bold');
    xPos = col1X + colWidths[0] + colWidths[1];
    doc.text('Total', xPos + 2, yPos + 5);
    doc.text(bill.totalAmount.toFixed(2), amountValueRightX, yPos + 5, { align: 'right' });
    yPos += 8;

    const amountWords = `Rupees ${numberToWords(Math.round(bill.totalAmount))} Only`;
    const amountWordsLines = toWrappedLines(amountWords, 125, 2);
    const amountWordsHeight = Math.max(8, amountWordsLines.length * lineHeight + 2);
    doc.rect(col1X, yPos, 180, amountWordsHeight);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Chargeable (in words) :', col1X + 2, yPos + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(amountWordsLines, col1X + 50, yPos + 5);
    yPos += amountWordsHeight;

    doc.rect(col1X, yPos, 180, 16);
    [60, 90, 120, 150].forEach(offset => doc.line(col1X + offset, yPos, col1X + offset, yPos + 16));
    doc.line(col1X, yPos + 8, 195, yPos + 8);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Taxable Value', col1X + 15, yPos + 4);
    doc.text('Central Tax', col1X + 68, yPos + 4);
    doc.text('State Tax', col1X + 128, yPos + 4);
    doc.text('Total Tax Amount', col1X + 155, yPos + 4);
    doc.text('Rate', col1X + 65, yPos + 11);
    doc.text('Amount', col1X + 80, yPos + 11);
    doc.text('Rate', col1X + 125, yPos + 11);
    doc.text('Amount', col1X + 140, yPos + 11);
    doc.setFont('helvetica', 'normal');
    doc.text(baseAmount.toFixed(2), col1X + 58, yPos + 14, { align: 'right' });
    doc.text(bill.cgstPercent + '%', col1X + 68, yPos + 14, { align: 'right' });
    doc.text(cgstAmount.toFixed(2), col1X + 88, yPos + 14, { align: 'right' });
    doc.text(bill.sgstPercent + '%', col1X + 128, yPos + 14, { align: 'right' });
    doc.text(sgstAmount.toFixed(2), col1X + 148, yPos + 14, { align: 'right' });
    doc.text((cgstAmount + sgstAmount).toFixed(2), col1X + 168, yPos + 14, { align: 'right' });
    yPos += 16;

    doc.rect(col1X, yPos, 180, 8);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', col1X + 2, yPos + 5);
    doc.text(baseAmount.toFixed(2), col1X + 58, yPos + 5, { align: 'right' });
    doc.text(cgstAmount.toFixed(2), col1X + 88, yPos + 5, { align: 'right' });
    doc.text(sgstAmount.toFixed(2), col1X + 148, yPos + 5, { align: 'right' });
    doc.text((cgstAmount + sgstAmount).toFixed(2), col1X + 168, yPos + 5, { align: 'right' });
    yPos += 8;

    const taxWords = `Rupees ${numberToWords(Math.round(cgstAmount + sgstAmount))} Only`;
    const taxWordsLines = toWrappedLines(taxWords, 148, 2);
    const taxWordsHeight = Math.max(6, taxWordsLines.length * 3 + 3);
    doc.rect(col1X, yPos, 180, taxWordsHeight);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Tax Amount (in words) :', col1X + 2, yPos + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(taxWordsLines, col1X + 35, yPos + 4);
    yPos += taxWordsHeight;

    doc.rect(col1X, yPos, 120, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Company's Bank Details:", col1X + 2, yPos + 4);
    doc.text('Bank Name:', col1X + 2, yPos + 8);
    doc.setFont('helvetica', 'bold');
    doc.text(details.bankName, col1X + 25, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.text('A/c No.:', col1X + 2, yPos + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(details.accountNumber, col1X + 25, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('Branch & IFS Code :', col1X + 2, yPos + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(details.branchIfsc, col1X + 25, yPos + 16);
    
    doc.rect(col1X + 120, yPos, 60, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const companyNameLines = toWrappedLines(`for ${profile?.businessName || 'VIVEKANANDA BATTERY CENTRE'}`, 50, 2);
    doc.text(companyNameLines, col1X + 125, yPos + 11);
    yPos += 20;

    doc.rect(col1X, yPos, 180, 12);
    doc.setFontSize(7);
    doc.text('Declaration', col1X + 2, yPos + 4);
    doc.text(details.declarationLine1, col1X + 2, yPos + 8);
    doc.text(details.declarationLine2, col1X + 2, yPos + 11);
    yPos += 14;

    doc.setFontSize(7);
    doc.text(details.jurisdictionText, pageWidth / 2, yPos, { align: 'center' });
    doc.text(details.computerGeneratedText, pageWidth / 2, yPos + 3, { align: 'center' });

    doc.save(`Invoice_${bill.invoiceNumber}.pdf`);
    return doc;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Make New Bill</h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowBillDetailsModal(true)}>
            📝 Edit Bill Details
          </button>
          {savedBill && (
            <>
              <button className="btn btn-primary" onClick={handleDownload}>
                📥 Download Invoice
              </button>
              <button className="btn btn-success" onClick={handlePrint}>
                🖨️ Print Invoice
              </button>
            </>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => {
              resetForm();
              navigate('/dashboard');
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <div>Loading data...</div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h3 style={{ marginBottom: '1rem' }}>No Items Available</h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              You need to add items and make purchases before creating bills.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/item-master')}>
                Add Items
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/purchase-item')}>
                Make Purchase
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bill-layout">
          <div className="card">
          <h3 className="section-title">Customer Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                className="form-input"
                value={customerDetails.name}
                onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                type="tel"
                className="form-input"
                value={customerDetails.phone}
                onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="form-input"
              rows={2}
              value={customerDetails.address}
              onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
              placeholder="Enter customer address (optional)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">GST Number</label>
            <input
              type="text"
              className="form-input"
              value={customerDetails.gstNumber}
              onChange={(e) => setCustomerDetails({ ...customerDetails, gstNumber: e.target.value })}
              placeholder="Enter GST number (optional)"
            />
          </div>

          <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

          <h3 className="section-title">Item Details</h3>

          <div className="form-group">
            <label className="form-label">Select Item</label>
            <button
              className="btn btn-primary"
              onClick={() => setShowItemModal(true)}
              style={{ width: '100%' }}
            >
              {billItem.model && billItem.type
                ? `${billItem.model} - ${billItem.type}`
                : '+ Select Item'}
            </button>
          </div>

          {billItem.model && billItem.type && (
            <>
              <div className="stock-info">
                <span>Available Stock: </span>
                <span className="stock-badge">{getAvailableStock()}</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billItem.quantity || ''}
                    onChange={(e) =>
                      setBillItem({ ...billItem, quantity: parseInt(e.target.value, 10) || 0 })
                    }
                    min="1"
                    max={getAvailableStock()}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billItem.rate || ''}
                    onChange={(e) =>
                      setBillItem({ ...billItem, rate: parseFloat(e.target.value) || 0 })
                    }
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Serial Numbers (Max 4)</label>
                <div className="serial-grid">
                  {billItem.serialNumbers.map((sn, index) => (
                    <input
                      key={index}
                      type="text"
                      className="form-input"
                      value={sn}
                      onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                      placeholder={`Serial #${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Round Off (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={roundOff}
                  onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                  step="0.01"
                />
              </div>

              <button
                className="btn btn-success"
                onClick={handleSaveBill}
                style={{ width: '100%' }}
              >
                Save Bill & Update Stock
              </button>
            </>
          )}
        </div>

        {billItem.model && billItem.type && (
          <div className="card calculation-summary">
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Invoice Summary
            </h3>

            <div className="summary-row">
              <span>Item:</span>
              <span>{billItem.model} - {billItem.type}</span>
            </div>

            <div className="summary-row">
              <span>Quantity:</span>
              <span>{billItem.quantity}</span>
            </div>

            <div className="summary-row">
              <span>Rate:</span>
              <span>₹ {billItem.rate.toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹ {amounts.subtotal}</span>
            </div>

            <div className="summary-row">
              <span>CGST ({billItem.cgstPercent}%):</span>
              <span>₹ {amounts.cgstAmount}</span>
            </div>

            <div className="summary-row">
              <span>SGST ({billItem.sgstPercent}%):</span>
              <span>₹ {amounts.sgstAmount}</span>
            </div>

            <div className="summary-row">
              <span>Total GST:</span>
              <span className="text-success">₹ {amounts.totalGst}</span>
            </div>

            {roundOff !== 0 && (
              <div className="summary-row">
                <span>Round Off:</span>
                <span className={roundOff > 0 ? 'text-success' : 'text-danger'}>
                  {roundOff > 0 ? '+' : ''} ₹ {roundOff.toFixed(2)}
                </span>
              </div>
            )}

            <div className="summary-row total">
              <span>Total Amount:</span>
              <span>₹ {amounts.total}</span>
            </div>
          </div>
        )}
        </div>
      )}

      {showBillDetailsModal && (
        <div className="modal-overlay" onClick={() => setShowBillDetailsModal(false)}>
          <div className="modal bill-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Make New Bill - Editable Details</h2>
              <button className="close-btn" onClick={() => setShowBillDetailsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <h3 className="section-title">Customer Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customerDetails.name}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={customerDetails.phone}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={customerDetails.address}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerDetails.gstNumber}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, gstNumber: e.target.value })}
                />
              </div>

              <h3 className="section-title">Item & Tax Details</h3>
              <div className="form-group">
                <label className="form-label">Select Item</label>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowItemModal(true)}
                  style={{ width: '100%' }}
                >
                  {billItem.model && billItem.type
                    ? `${billItem.model} - ${billItem.type}`
                    : '+ Select Item'}
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billItem.quantity || ''}
                    onChange={(e) =>
                      setBillItem({ ...billItem, quantity: parseInt(e.target.value, 10) || 0 })
                    }
                    min="1"
                    max={getAvailableStock()}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rate (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billItem.rate || ''}
                    onChange={(e) =>
                      setBillItem({ ...billItem, rate: parseFloat(e.target.value) || 0 })
                    }
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CGST (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billItem.cgstPercent}
                    onChange={(e) =>
                      setBillItem({ ...billItem, cgstPercent: parseFloat(e.target.value) || 0 })
                    }
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SGST (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={billItem.sgstPercent}
                    onChange={(e) =>
                      setBillItem({ ...billItem, sgstPercent: parseFloat(e.target.value) || 0 })
                    }
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Serial Numbers (Max 4)</label>
                <div className="serial-grid">
                  {billItem.serialNumbers.map((sn, index) => (
                    <input
                      key={index}
                      type="text"
                      className="form-input"
                      value={sn}
                      onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                      placeholder={`Serial #${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Round Off (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={roundOff}
                  onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                  step="0.01"
                />
              </div>

              <h3 className="section-title">Invoice Header & Transport Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Invoice Title</label>
                  <input className="form-input" value={invoiceDetails.invoiceTitle} onChange={(e) => handleInvoiceDetailChange('invoiceTitle', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Copy Label</label>
                  <input className="form-input" value={invoiceDetails.invoiceCopyLabel} onChange={(e) => handleInvoiceDetailChange('invoiceCopyLabel', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Invoice Date</label>
                  <input type="date" className="form-input" value={invoiceDetails.invoiceDate} onChange={(e) => handleInvoiceDetailChange('invoiceDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Note</label>
                  <input className="form-input" value={invoiceDetails.deliveryNote} onChange={(e) => handleInvoiceDetailChange('deliveryNote', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mode/Terms of Payment</label>
                  <input className="form-input" value={invoiceDetails.modeTermsOfPayment} onChange={(e) => handleInvoiceDetailChange('modeTermsOfPayment', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier's Ref.</label>
                  <input className="form-input" value={invoiceDetails.suppliersRef} onChange={(e) => handleInvoiceDetailChange('suppliersRef', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Other Reference(s)</label>
                  <input className="form-input" value={invoiceDetails.otherReferences} onChange={(e) => handleInvoiceDetailChange('otherReferences', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Buyer's Order No.</label>
                  <input className="form-input" value={invoiceDetails.buyersOrderNo} onChange={(e) => handleInvoiceDetailChange('buyersOrderNo', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Buyer's Order Date</label>
                  <input className="form-input" value={invoiceDetails.buyersOrderDate} onChange={(e) => handleInvoiceDetailChange('buyersOrderDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Despatched Document No.</label>
                  <input className="form-input" value={invoiceDetails.dispatchDocNo} onChange={(e) => handleInvoiceDetailChange('dispatchDocNo', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Delivery Note Date</label>
                  <input className="form-input" value={invoiceDetails.deliveryNoteDate} onChange={(e) => handleInvoiceDetailChange('deliveryNoteDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Despatched Through</label>
                  <input className="form-input" value={invoiceDetails.dispatchedThrough} onChange={(e) => handleInvoiceDetailChange('dispatchedThrough', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input className="form-input" value={invoiceDetails.destination} onChange={(e) => handleInvoiceDetailChange('destination', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Terms of Delivery</label>
                  <input className="form-input" value={invoiceDetails.termsOfDelivery} onChange={(e) => handleInvoiceDetailChange('termsOfDelivery', e.target.value)} />
                </div>
              </div>

              <h3 className="section-title">Goods/Bank/Declaration</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Buyer Heading</label>
                  <input className="form-input" value={invoiceDetails.buyerHeading} onChange={(e) => handleInvoiceDetailChange('buyerHeading', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">HSN/SAC</label>
                  <input className="form-input" value={invoiceDetails.hsnSac} onChange={(e) => handleInvoiceDetailChange('hsnSac', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">SF Column</label>
                  <input className="form-input" value={invoiceDetails.sfCode} onChange={(e) => handleInvoiceDetailChange('sfCode', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Per Unit</label>
                  <input className="form-input" value={invoiceDetails.perUnit} onChange={(e) => handleInvoiceDetailChange('perUnit', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tax Label 1</label>
                  <input className="form-input" value={invoiceDetails.outputCgstLabel} onChange={(e) => handleInvoiceDetailChange('outputCgstLabel', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax Label 2</label>
                  <input className="form-input" value={invoiceDetails.outputSgstLabel} onChange={(e) => handleInvoiceDetailChange('outputSgstLabel', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Round Off Label</label>
                <input className="form-input" value={invoiceDetails.roundOffLabel} onChange={(e) => handleInvoiceDetailChange('roundOffLabel', e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input className="form-input" value={invoiceDetails.bankName} onChange={(e) => handleInvoiceDetailChange('bankName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">A/c No.</label>
                  <input className="form-input" value={invoiceDetails.accountNumber} onChange={(e) => handleInvoiceDetailChange('accountNumber', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Branch & IFSC</label>
                <input className="form-input" value={invoiceDetails.branchIfsc} onChange={(e) => handleInvoiceDetailChange('branchIfsc', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Declaration Line 1</label>
                <input className="form-input" value={invoiceDetails.declarationLine1} onChange={(e) => handleInvoiceDetailChange('declarationLine1', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Declaration Line 2</label>
                <input className="form-input" value={invoiceDetails.declarationLine2} onChange={(e) => handleInvoiceDetailChange('declarationLine2', e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jurisdiction Text</label>
                  <input className="form-input" value={invoiceDetails.jurisdictionText} onChange={(e) => handleInvoiceDetailChange('jurisdictionText', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Computer Generated Text</label>
                  <input className="form-input" value={invoiceDetails.computerGeneratedText} onChange={(e) => handleInvoiceDetailChange('computerGeneratedText', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBillDetailsModal(false)}>
                Close
              </button>
              <button className="btn btn-success" onClick={handleSaveBill}>
                Save Bill & Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Select Item</h2>
              <button className="close-btn" onClick={() => setShowItemModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="item-list">
                {items.map((item) => {
                  const stockItem = stock.find(
                    (s) => s.model === item.model && s.type === item.type
                  );
                  const availableStock = stockItem?.availableStock || 0;

                  return (
                    <div
                      key={item.id}
                      className="item-card"
                      onClick={() => {
                        handleItemSelect(item.id);
                        setShowItemModal(false);
                      }}
                    >
                      <div className="item-info">
                        <div className="item-name">
                          {item.model} - {item.type}
                        </div>
                        <div className="item-tax">
                          GST: {item.cgstPercent + item.sgstPercent}%
                        </div>
                      </div>
                      <div className="item-stock">
                        <span className={availableStock > 0 ? 'in-stock' : 'out-of-stock'}>
                          Stock: {availableStock}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    
    </div>
  );
};

export default MakeBill;

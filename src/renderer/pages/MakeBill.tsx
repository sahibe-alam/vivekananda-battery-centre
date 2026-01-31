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

const MakeBill: React.FC<Props> = ({ companyId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [billItem, setBillItem] = useState<BillItem>({
    model: '',
    type: '',
    serialNumbers: ['', '', '', ''],
    quantity: 1,
    rate: 0,
    cgstPercent: 9,
    sgstPercent: 9,
  });
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    phone: '',
    address: '',
    gstNumber: '',
  });
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
      });

      alert('Bill saved successfully! Stock updated.');
      
      // Reset form
      setBillItem({
        model: '',
        type: '',
        serialNumbers: ['', '', '', ''],
        quantity: 1,
        rate: 0,
        cgstPercent: 9,
        sgstPercent: 9,
      });
      setCustomerDetails({
        name: '',
        phone: '',
        address: '',
        gstNumber: '',
      });
      setRoundOff(0);
      setShowItemModal(false);
      
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
    const pageWidth = doc.internal.pageSize.getWidth();
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
    doc.text('GST Tax Invoice', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    doc.setFontSize(10);
    doc.text('(Duplicate)', pageWidth / 2, yPos, { align: 'center' });
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
    doc.text(new Date(bill.date).toLocaleDateString(), col3X + 15, yPos + 5);
    doc.text('Delivery Note', col1X + 2, yPos + 13);
    doc.text('Mode/Terms of Payment', col3X + 2, yPos + 13);
    doc.text("Supplier's Ref.", col1X + 2, yPos + 21);
    doc.text('Other Reference(s)', col3X + 2, yPos + 21);
    doc.text("Buyer's Order No", col1X + 2, yPos + 29);
    doc.text('Dated', col3X + 2, yPos + 29);
    doc.text('Despatched DocumentNo.', col1X + 2, yPos + 37);
    doc.text('Delivery Note Date', col3X + 2, yPos + 37);
    yPos += 42;

    doc.rect(col1X, yPos, 180, 16);
    doc.line(col2X, yPos, col2X, yPos + 16);
    doc.line(col3X, yPos, col3X, yPos + 16);
    doc.line(col1X, yPos + 8, 195, yPos + 8);
    doc.text('Despatched through', col1X + 2, yPos + 5);
    doc.text('Destination', col3X + 2, yPos + 5);
    doc.text('Terms of delivery', col1X + 2, yPos + 13);
    yPos += 18;

    doc.rect(col1X, yPos, 180, 25);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Buyer (if other than consignee)', col1X + 2, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const clientLines = bill.clientDetails.split('\n');
    let clientY = yPos + 10;
    clientLines.forEach((line: string) => {
      if (clientY < yPos + 23) {
        doc.text(line.substring(0, 80), col1X + 2, clientY);
        clientY += 4;
      }
    });
    yPos += 27;

    const colWidths = [10, 15, 80, 20, 15, 12, 12, 16];
    doc.rect(col1X, yPos, 180, 8);
    let xPos = col1X;
    doc.setFont('helvetica', 'bold');
    ['Sl No.', 'SF', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'Per', 'Amount'].forEach((header, i) => {
      doc.text(header, xPos + 2, yPos + 5);
      xPos += colWidths[i];
      if (i < 7) doc.line(xPos, yPos, xPos, yPos + 50);
    });
    yPos += 8;

    doc.rect(col1X, yPos, 180, 42);
    doc.setFont('helvetica', 'normal');
    xPos = col1X;
    doc.text('1', xPos + 3, yPos + 5);
    xPos += colWidths[0];
    doc.text('SF', xPos + 1, yPos + 5);
    xPos += colWidths[1];
    
    let descY = yPos + 5;
    doc.text(bill.model, xPos + 2, descY);
    descY += 4;
    doc.text(`Type:- ${bill.type}`, xPos + 2, descY);
    descY += 4;
    doc.text(`SN:- ${bill.serialNumbers.join(', ')}`, xPos + 2, descY);
    descY += 8;
    doc.text('OUTPUT CGST', xPos + 50, descY);
    doc.text(bill.cgstPercent + '%', xPos + 70, descY);
    descY += 4;
    doc.text('OUTPUT SGST', xPos + 50, descY);
    doc.text(bill.sgstPercent + '%', xPos + 70, descY);
    descY += 4;
    doc.text('ROUND OFF', xPos + 50, descY);
    
    xPos += colWidths[2];
    doc.text('8507', xPos + 2, yPos + 5);
    xPos += colWidths[3];
    doc.text(bill.quantity.toString(), xPos + 2, yPos + 5);
    xPos += colWidths[4];
    
    const baseAmount = bill.quantity * bill.rate;
    doc.text(bill.rate.toFixed(2), xPos + 2, yPos + 5);
    xPos += colWidths[5];
    doc.text('PCs', xPos + 2, yPos + 5);
    xPos += colWidths[6];
    
    const cgstAmount = bill.cgstAmount;
    const sgstAmount = bill.sgstAmount;
    
    doc.text('INR', xPos + 2, yPos + 5);
    doc.text(baseAmount.toFixed(2), xPos + 14, yPos + 9, { align: 'right' });
    doc.text('INR', xPos + 2, yPos + 25);
    doc.text(cgstAmount.toFixed(2), xPos + 14, yPos + 29, { align: 'right' });
    doc.text('INR', xPos + 2, yPos + 33);
    doc.text(sgstAmount.toFixed(2), xPos + 14, yPos + 37, { align: 'right' });
    doc.text('INR', xPos + 2, yPos + 41);
    yPos += 42;

    doc.rect(col1X, yPos, 180, 8);
    doc.setFont('helvetica', 'bold');
    xPos = col1X + colWidths[0] + colWidths[1];
    doc.text('Total', xPos + 2, yPos + 5);
    xPos = col1X + 180 - colWidths[7];
    doc.text(bill.totalAmount.toFixed(2), xPos + 14, yPos + 5, { align: 'right' });
    yPos += 8;

    doc.rect(col1X, yPos, 180, 8);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Chargeable (in words) :', col1X + 2, yPos + 5);
    doc.setFont('helvetica', 'bold');
    doc.text('Rupees ' + numberToWords(Math.round(bill.totalAmount)) + ' Only', col1X + 50, yPos + 5);
    yPos += 8;

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
    doc.text(baseAmount.toFixed(2), col1X + 25, yPos + 14, { align: 'right' });
    doc.text(bill.cgstPercent + '%', col1X + 68, yPos + 14, { align: 'right' });
    doc.text(cgstAmount.toFixed(2), col1X + 88, yPos + 14, { align: 'right' });
    doc.text(bill.sgstPercent + '%', col1X + 128, yPos + 14, { align: 'right' });
    doc.text(sgstAmount.toFixed(2), col1X + 148, yPos + 14, { align: 'right' });
    doc.text((cgstAmount + sgstAmount).toFixed(2), col1X + 168, yPos + 14, { align: 'right' });
    yPos += 16;

    doc.rect(col1X, yPos, 180, 8);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', col1X + 20, yPos + 5);
    doc.text(baseAmount.toFixed(2), col1X + 25, yPos + 5, { align: 'right' });
    doc.text(cgstAmount.toFixed(2), col1X + 88, yPos + 5, { align: 'right' });
    doc.text(sgstAmount.toFixed(2), col1X + 148, yPos + 5, { align: 'right' });
    doc.text((cgstAmount + sgstAmount).toFixed(2), col1X + 168, yPos + 5, { align: 'right' });
    yPos += 8;

    doc.rect(col1X, yPos, 180, 6);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Tax Amount (in words) :', col1X + 2, yPos + 4);
    doc.setFont('helvetica', 'bold');
    doc.text('Rupees ' + numberToWords(Math.round(cgstAmount + sgstAmount)) + ' Only', col1X + 35, yPos + 4);
    yPos += 6;

    doc.rect(col1X, yPos, 120, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text("Company's Bank Details:", col1X + 2, yPos + 4);
    doc.text('Bank Name:', col1X + 2, yPos + 8);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK OF INDIA', col1X + 25, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.text('A/c No.:', col1X + 2, yPos + 12);
    doc.setFont('helvetica', 'bold');
    doc.text('428120110000218', col1X + 25, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('Branch & IFS Code :', col1X + 2, yPos + 16);
    doc.setFont('helvetica', 'bold');
    doc.text('BALLY BAZAR & BKID0004281', col1X + 25, yPos + 16);
    
    doc.rect(col1X + 120, yPos, 60, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`for ${profile?.businessName || 'VIVEKANANDA BATTERY CENTRE'}`, col1X + 125, yPos + 15);
    yPos += 20;

    doc.rect(col1X, yPos, 180, 12);
    doc.setFontSize(7);
    doc.text('Declaration', col1X + 2, yPos + 4);
    doc.text('We declare that this invoice shows the actual price of the goods', col1X + 2, yPos + 8);
    doc.text('described and that all particulars are true and correct.', col1X + 2, yPos + 11);
    yPos += 14;

    doc.setFontSize(7);
    doc.text('SUBJECT TO HOWRAH JURISDICTION', pageWidth / 2, yPos, { align: 'center' });
    doc.text('This is a Computer Generated Invoice', pageWidth / 2, yPos + 3, { align: 'center' });

    doc.save(`Invoice_${bill.invoiceNumber}.pdf`);
    return doc;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Make New Bill</h1>
        <div className="page-actions">
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
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
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
                    value={billItem.quantity}
                    onChange={(e) =>
                      setBillItem({ ...billItem, quantity: parseInt(e.target.value) || 1 })
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

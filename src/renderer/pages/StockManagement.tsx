import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stock, Purchase, Sale, Profile } from '@shared/types';
import jsPDF from 'jspdf';
import './StockManagement.css';

interface Props {
  companyId: string;
}

type Tab = 'stock' | 'purchases' | 'sales';

const StockManagement: React.FC<Props> = ({ companyId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [stock, setStock] = useState<Stock[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stockData, purchasesData, salesData, profileData] = await Promise.all([
        window.electronAPI.getStock({ companyId }),
        window.electronAPI.getPurchases({ companyId }),
        window.electronAPI.getSales({ companyId }),
        window.electronAPI.getProfile(),
      ]);
      setStock(stockData);
      setPurchases(purchasesData);
      setSales(salesData);
      setProfile(profileData);
      console.log('Stock data loaded:', { 
        stock: stockData.length, 
        purchases: purchasesData.length, 
        sales: salesData.length 
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load data. Please check the console for details.');
    } finally {
      setLoading(false);
    }
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

  const generatePDF = (sale: Sale) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;
    const primaryBank = profile?.bankDetail;
    const bankName = primaryBank?.bankName?.trim() || 'BANK OF INDIA';
    const accountNumber = primaryBank?.accountNumber?.trim() || '428120110000218';
    const branchAndIfsc =
      `${primaryBank?.branch?.trim() || 'BALLY BAZAR'} & ${
        primaryBank?.ifscCode?.trim() || 'BKID0004281'
      }`;

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
    doc.text(sale.invoiceNumber, col2X + 2, yPos + 5);
    doc.text('Dated', col3X + 2, yPos + 5);
    doc.text(new Date(sale.date).toLocaleDateString(), col3X + 15, yPos + 5);
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
    const clientLines = sale.clientDetails.split('\n');
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
    doc.text(sale.model, xPos + 2, descY);
    descY += 4;
    doc.text(`Type:- ${sale.type}`, xPos + 2, descY);
    descY += 4;
    doc.text(`SN:- ${sale.serialNumbers.join(', ')}`, xPos + 2, descY);
    descY += 8;
    doc.text('OUTPUT CGST', xPos + 50, descY);
    doc.text(sale.cgstPercent + '%', xPos + 70, descY);
    descY += 4;
    doc.text('OUTPUT SGST', xPos + 50, descY);
    doc.text(sale.sgstPercent + '%', xPos + 70, descY);
    descY += 4;
    doc.text('ROUND OFF', xPos + 50, descY);
    
    xPos += colWidths[2];
    doc.text('8507', xPos + 2, yPos + 5);
    xPos += colWidths[3];
    doc.text(sale.quantity.toString(), xPos + 2, yPos + 5);
    xPos += colWidths[4];
    
    const baseAmount = sale.quantity * sale.rate;
    doc.text(sale.rate.toFixed(2), xPos + 2, yPos + 5);
    xPos += colWidths[5];
    doc.text('PCs', xPos + 2, yPos + 5);
    xPos += colWidths[6];
    
    const cgstAmount = baseAmount * (sale.cgstPercent / 100);
    const sgstAmount = baseAmount * (sale.sgstPercent / 100);
    
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
    doc.text(sale.totalAmount.toFixed(2), xPos + 14, yPos + 5, { align: 'right' });
    yPos += 8;

    doc.rect(col1X, yPos, 180, 8);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Chargeable (in words) :', col1X + 2, yPos + 5);
    doc.setFont('helvetica', 'bold');
    doc.text('Rupees ' + numberToWords(Math.round(sale.totalAmount)) + ' Only', col1X + 50, yPos + 5);
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
    doc.text(sale.cgstPercent + '%', col1X + 68, yPos + 14, { align: 'right' });
    doc.text(cgstAmount.toFixed(2), col1X + 88, yPos + 14, { align: 'right' });
    doc.text(sale.sgstPercent + '%', col1X + 128, yPos + 14, { align: 'right' });
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
    doc.text(bankName, col1X + 25, yPos + 8);
    doc.setFont('helvetica', 'normal');
    doc.text('A/c No.:', col1X + 2, yPos + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(accountNumber, col1X + 25, yPos + 12);
    doc.setFont('helvetica', 'normal');
    doc.text('Branch & IFS Code :', col1X + 2, yPos + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(branchAndIfsc, col1X + 25, yPos + 16);
    
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

    return doc;
  };

  const handlePrintInvoice = async (sale: Sale) => {
    const pdf = generatePDF(sale);
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

  const handleDownloadInvoice = (sale: Sale) => {
    const pdf = generatePDF(sale);
    pdf.save(`Invoice_${sale.invoiceNumber}.pdf`);
  };

  if (loading) {
    return <div className="page-container loading">Loading...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Stock Management</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
      </div>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            Current Stock
          </button>
          <button
            className={`tab ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            Purchase History
          </button>
          <button
            className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales History
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'stock' && (
            <div className="table-container">
              {stock.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <h3>No Stock Available</h3>
                  <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                    Make some purchases to see stock here
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/purchase-item')}
                    style={{ marginTop: '1rem' }}
                  >
                    Make Purchase
                  </button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Type</th>
                      <th>Available Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item, index) => (
                      <tr key={index}>
                        <td>{item.model}</td>
                        <td>{item.type}</td>
                        <td>
                          <span className="stock-quantity">
                            {item.availableStock}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              item.availableStock === 0
                                ? 'out-of-stock'
                                : item.availableStock < 5
                                ? 'low-stock'
                                : 'in-stock'
                            }`}
                          >
                            {item.availableStock === 0
                              ? 'Out of Stock'
                              : item.availableStock < 5
                              ? 'Low Stock'
                              : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="table-container">
              {purchases.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
                  <h3>No Purchase Records</h3>
                  <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                    Purchase history will appear here
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/purchase-item')}
                    style={{ marginTop: '1rem' }}
                  >
                    Make First Purchase
                  </button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Model</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Discount</th>
                      <th>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td>{new Date(purchase.date).toLocaleDateString()}</td>
                        <td>{purchase.invoiceNumber}</td>
                        <td>{purchase.model}</td>
                        <td>{purchase.type}</td>
                        <td>{purchase.quantity}</td>
                        <td>₹ {purchase.rate.toFixed(2)}</td>
                        <td>{purchase.discountPercent}%</td>
                        <td className="amount">₹ {purchase.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="table-container">
              {sales.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
                  <h3>No Sales Records</h3>
                  <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                    Sales history will appear here
                  </p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/make-bill')}
                    style={{ marginTop: '1rem' }}
                  >
                    Create First Bill
                  </button>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Model</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id}>
                        <td>{new Date(sale.date).toLocaleDateString()}</td>
                        <td>{sale.invoiceNumber}</td>
                        <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sale.clientDetails.split('\n')[0]}
                        </td>
                        <td>{sale.model}</td>
                        <td>{sale.type}</td>
                        <td>{sale.quantity}</td>
                        <td>₹ {sale.rate.toFixed(2)}</td>
                        <td className="amount">₹ {sale.totalAmount.toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn-icon"
                              onClick={() => handleDownloadInvoice(sale)}
                              title="Download Invoice"
                            >
                              📥
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handlePrintInvoice(sale)}
                              title="Print Invoice"
                            >
                              🖨️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockManagement;

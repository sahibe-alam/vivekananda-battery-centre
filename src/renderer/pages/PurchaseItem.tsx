import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ItemMaster } from '@shared/types';
import './PurchaseItem.css';

interface Props {
  companyId: string;
}

const PurchaseItem: React.FC<Props> = ({ companyId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [formData, setFormData] = useState({
    model: '',
    type: '',
    rate: 0,
    quantity: 1,
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    discountPercent: 0,
    cgstPercent: 9,
    sgstPercent: 9,
    roundOff: 0,
  });

  useEffect(() => {
    loadItems();
  }, [companyId]);

  const loadItems = async () => {
    try {
      const data = await window.electronAPI.getItems({ companyId });
      setItems(data);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedItem = items.find((item) => item.id === e.target.value);
    if (selectedItem) {
      setFormData({
        ...formData,
        model: selectedItem.model,
        type: selectedItem.type,
        cgstPercent: selectedItem.cgstPercent,
        sgstPercent: selectedItem.sgstPercent,
      });
    }
  };

  const calculateAmounts = () => {
    const subtotal = formData.rate * formData.quantity;
    const discountAmount = (subtotal * formData.discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const cgstAmount = (afterDiscount * formData.cgstPercent) / 100;
    const sgstAmount = (afterDiscount * formData.sgstPercent) / 100;
    const totalBeforeRound = afterDiscount + cgstAmount + sgstAmount;
    const total = totalBeforeRound + formData.roundOff;

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      afterDiscount: afterDiscount.toFixed(2),
      cgstAmount: cgstAmount.toFixed(2),
      sgstAmount: sgstAmount.toFixed(2),
      totalGst: (cgstAmount + sgstAmount).toFixed(2),
      total: total.toFixed(2),
    };
  };

  const amounts = calculateAmounts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.model || !formData.type || !formData.invoiceNumber) {
      alert('Please fill all required fields');
      return;
    }

    if (formData.rate <= 0 || formData.quantity <= 0) {
      alert('Rate and quantity must be greater than 0');
      return;
    }

    try {
      await window.electronAPI.addPurchase({
        companyId,
        model: formData.model,
        type: formData.type,
        rate: formData.rate,
        quantity: formData.quantity,
        invoiceNumber: formData.invoiceNumber,
        date: formData.date,
        discountPercent: formData.discountPercent,
        cgstPercent: formData.cgstPercent,
        sgstPercent: formData.sgstPercent,
        roundOff: formData.roundOff,
      });

      alert('Purchase added successfully! Stock updated.');
      
      // Reset form
      setFormData({
        model: '',
        type: '',
        rate: 0,
        quantity: 1,
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        discountPercent: 0,
        cgstPercent: 9,
        sgstPercent: 9,
        roundOff: 0,
      });
    } catch (error) {
      console.error('Failed to add purchase:', error);
      alert('Failed to add purchase');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Purchase Item</h1>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
      </div>

      <div className="purchase-layout">
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Select Item (Optional)</label>
              <select className="form-select" onChange={handleItemSelect}>
                <option value="">-- Select from Item Master --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.model} - {item.type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Model *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rate (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.rate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })
                  }
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Invoice Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.invoiceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Discount %</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.discountPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })
                  }
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Round Off (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.roundOff}
                  onChange={(e) =>
                    setFormData({ ...formData, roundOff: parseFloat(e.target.value) || 0 })
                  }
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CGST %</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.cgstPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, cgstPercent: parseFloat(e.target.value) || 0 })
                  }
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">SGST %</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.sgstPercent}
                  onChange={(e) =>
                    setFormData({ ...formData, sgstPercent: parseFloat(e.target.value) || 0 })
                  }
                  step="0.1"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
              Save Purchase & Update Stock
            </button>
          </form>
        </div>

        <div className="card calculation-summary">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            Calculation Summary
          </h3>
          
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>₹ {amounts.subtotal}</span>
          </div>
          
          {formData.discountPercent > 0 && (
            <>
              <div className="summary-row">
                <span>Discount ({formData.discountPercent}%):</span>
                <span className="text-danger">- ₹ {amounts.discountAmount}</span>
              </div>
              <div className="summary-row">
                <span>After Discount:</span>
                <span>₹ {amounts.afterDiscount}</span>
              </div>
            </>
          )}
          
          <div className="summary-row">
            <span>CGST ({formData.cgstPercent}%):</span>
            <span>₹ {amounts.cgstAmount}</span>
          </div>
          
          <div className="summary-row">
            <span>SGST ({formData.sgstPercent}%):</span>
            <span>₹ {amounts.sgstAmount}</span>
          </div>
          
          <div className="summary-row">
            <span>Total GST:</span>
            <span className="text-success">₹ {amounts.totalGst}</span>
          </div>
          
          {formData.roundOff !== 0 && (
            <div className="summary-row">
              <span>Round Off:</span>
              <span className={formData.roundOff > 0 ? 'text-success' : 'text-danger'}>
                {formData.roundOff > 0 ? '+' : ''} ₹ {formData.roundOff.toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="summary-row total">
            <span>Total Amount:</span>
            <span>₹ {amounts.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseItem;

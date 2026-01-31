import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ItemMaster } from '@shared/types';
import './ItemMaster.css';

interface Props {
  companyId: string;
}

const ItemMasterPage: React.FC<Props> = ({ companyId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    model: '',
    type: '',
    cgstPercent: 9,
    sgstPercent: 9,
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
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!formData.model.trim() || !formData.type.trim()) {
      alert('Please fill all fields');
      return;
    }

    try {
      await window.electronAPI.addItem({
        companyId,
        model: formData.model.trim(),
        type: formData.type.trim(),
        cgstPercent: formData.cgstPercent,
        sgstPercent: formData.sgstPercent,
      });

      setFormData({ model: '', type: '', cgstPercent: 9, sgstPercent: 9 });
      setShowAddModal(false);
      await loadItems();
    } catch (error) {
      console.error('Failed to add item:', error);
      alert('Failed to add item');
    }
  };

  const handleEdit = (item: ItemMaster) => {
    setEditingId(item.id);
  };

  const handleSaveEdit = async (item: ItemMaster) => {
    try {
      await window.electronAPI.updateItem({
        id: item.id,
        model: item.model,
        type: item.type,
        cgstPercent: item.cgstPercent,
        sgstPercent: item.sgstPercent,
      });
      setEditingId(null);
      await loadItems();
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await window.electronAPI.deleteItem({ id });
      await loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item');
    }
  };

  const handleFieldChange = (id: string, field: keyof ItemMaster, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  if (loading) {
    return <div className="page-container loading">Loading items...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Item Master</h1>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Item
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <div className="empty-state">
            <p>No items found. Click "Add Item" to create your first item.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Type</th>
                  <th>CGST %</th>
                  <th>SGST %</th>
                  <th>Total GST %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onDoubleClick={() => handleEdit(item)}
                    className={editingId === item.id ? 'editing' : ''}
                  >
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="form-input"
                          value={item.model}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'model', e.target.value)
                          }
                        />
                      ) : (
                        item.model
                      )}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className="form-input"
                          value={item.type}
                          onChange={(e) =>
                            handleFieldChange(item.id, 'type', e.target.value)
                          }
                        />
                      ) : (
                        item.type
                      )}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="form-input"
                          value={item.cgstPercent}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'cgstPercent',
                              parseFloat(e.target.value)
                            )
                          }
                          step="0.1"
                        />
                      ) : (
                        `${item.cgstPercent}%`
                      )}
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className="form-input"
                          value={item.sgstPercent}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id,
                              'sgstPercent',
                              parseFloat(e.target.value)
                            )
                          }
                          step="0.1"
                        />
                      ) : (
                        `${item.sgstPercent}%`
                      )}
                    </td>
                    <td>
                      {(item.cgstPercent + item.sgstPercent).toFixed(1)}%
                    </td>
                    <td>
                      {editingId === item.id ? (
                        <div className="action-buttons-inline">
                          <button
                            className="btn-small btn-success"
                            onClick={() => handleSaveEdit(item)}
                          >
                            Save
                          </button>
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons-inline">
                          <button
                            className="btn-small btn-primary"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Item</h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Model</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g., SF Sonic"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  placeholder="e.g., 12V 65Ah"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">CGST %</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.cgstPercent}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cgstPercent: parseFloat(e.target.value),
                      })
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
                      setFormData({
                        ...formData,
                        sgstPercent: parseFloat(e.target.value),
                      })
                    }
                    step="0.1"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddItem}>
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMasterPage;

import React, { useState, useEffect } from 'react';
import api from '../../../Utils/api';
import IssueOutForm from './IssueOutForm';
import IssueOutTable from '../../../Components/SM/IssueOutTable';
import IssueOutModal from '../../Components/SM/IssueOutModal';

const IssueOutContainer = () => {
  const [formType, setFormType] = useState('material');
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    issueTo: '',
    reason: '',
    returnStatus: 'No',
  });

  const [petrolForm, setPetrolForm] = useState({
    issueTo: '',
    vehicleReg: '',
    requestedLitres: '',
  });

  const [issuedItems, setIssuedItems] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Fetch issued records
  useEffect(() => {
    const fetchIssuedItems = async () => {
      try {
        const response = await api.get('/item_issuance/issuerecords/');
        setIssuedItems(response.data);
      } catch (error) {
        console.error("Error fetching issue records:", error);
      }
    };

    fetchIssuedItems();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePetrolChange = (e) => {
    setPetrolForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newIssue =
      formType === 'material'
        ? {
            issued_to: formData.issueTo,
            issued_by: localStorage.getItem('username'),
            issue_type: 'material',
            reason: formData.reason,
            status: 'Pending',
            approval_status: 'Pending',
            items: [
              {
                item_id: formData.itemName,
                quantity_issued: formData.quantity,
                should_return: formData.returnStatus === 'Yes',
              },
            ],
          }
        : {
            issued_to: petrolForm.issueTo,
            issued_by: localStorage.getItem('username'),
            issue_type: 'petrol',
            vehicle_reg_no: petrolForm.vehicleReg,
            current_litres: petrolForm.requestedLitres,
            reason: '',
            status: 'Pending',
            approval_status: 'Pending',
            items: [],
          };

    try {
      const response = await api.post('/item_issuance/issuerecords/', newIssue);
      setIssuedItems(prev => [...prev, response.data]);
      
      // Reset form
      if (formType === 'material') {
        setFormData({
          itemName: '',
          quantity: '',
          issueTo: '',
          reason: '',
          returnStatus: 'No',
        });
      } else {
        setPetrolForm({
          issueTo: '',
          vehicleReg: '',
          requestedLitres: '',
        });
      }
    } catch (error) {
      console.error('Error submitting issue record:', error);
    }
  };

  const handleIssueNow = async (id) => {
    try {
      await api.post(`/item_issuance/issuerecords/${id}/mark_as_issued/`);
      setIssuedItems(prev =>
        prev.map(issue =>
          issue.id === id ? { ...issue, status: 'Issued' } : issue
        )
      );
    } catch (error) {
      console.error('Failed to mark as issued:', error);
    }
  };

  const handleConfirmIssue = async (issueId) => {
    setIsConfirming(true);
    try {
      await api.put(`/item_issuance/issuerecords/${issueId}/confirm/`);
      
      setIssuedItems(prevItems => 
        prevItems.map(item => 
          item.id === issueId 
            ? { ...item, status: 'Confirmed' } 
            : item
        )
      );
    } catch (error) {
      console.error('Failed to confirm issue:', error);
      alert('Failed to confirm issue');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this issue?')) {
      try {
        await api.post(`/item_issuance/issuerecords/${id}/cancel/`);
        setIssuedItems(prev =>
          prev.map(issue =>
            issue.id === id
              ? { ...issue, status: 'Cancelled', approval_status: 'Cancelled' }
              : issue
          )
        );
        setShowModal(false);
      } catch (error) {
        console.error('Failed to cancel issue:', error);
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedIssue) return;
    
    try {
      const response = await api.patch(`/item_issuance/issuerecords/${selectedIssue.id}/`, selectedIssue);
      setIssuedItems(prev =>
        prev.map(issue =>
          issue.id === selectedIssue.id ? response.data : issue
        )
      );
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  return (
    <div className="p-4 mt-20">
      <h2 className="text-2xl font-semibold mb-6">Issue Out</h2>

      <IssueOutForm
        formType={formType}
        setFormType={setFormType}
        formData={formData}
        handleChange={handleChange}
        petrolForm={petrolForm}
        handlePetrolChange={handlePetrolChange}
        handleSubmit={handleSubmit}
      />

      <IssueOutTable
        issuedItems={issuedItems}
        setSelectedIssue={setSelectedIssue}
        setShowModal={setShowModal}
        handleIssueNow={handleIssueNow}
        handleConfirmIssue={handleConfirmIssue}
        isConfirming={isConfirming}
      />

      {showModal && (
        <IssueOutModal
          selectedIssue={selectedIssue}
          setSelectedIssue={setSelectedIssue}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          handleSaveChanges={handleSaveChanges}
          handleCancel={handleCancel}
          closeModal={() => {
            setIsEditing(false);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

export default IssueOutContainer;
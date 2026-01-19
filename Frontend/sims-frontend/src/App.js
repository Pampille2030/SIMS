import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './Pages/General/Login';
import Layout from './Components/Layout';
import Unauthorized from './Pages/General/Unauthorized';
import ForgotPassword from './Pages/Store/ForgotPassword';

// Store Manager Pages
import IssueOutPage from './Pages/Store/IssueOut';
import NewItemPage from './Pages/Store/NewItem';
import StockInPage from './Pages/Store/StockIn';
import ReturnedItemPage from './Pages/Store/ReturnedItem';
import ReportsPage from './Pages/Store/InventoryReports';
import PurchaseOrderContainer from './Pages/Store/PurchaseorderContainer';

import WriteReportPage from './Pages/Store/WriteReportPage';

// Shared/MD Reports
import GeneralReportsPage from './Pages/Store/GeneralReport';
import NotificationsPage from './Pages/General/Notification';

// Managing Director Pages
import MDApprovalPage from './Pages/MDirector/PurchaseorderApproval';
import IssueOutApprovalPage from './Pages/MDirector/IssueOutApproval';
import ApproveEmployees from './Pages/MDirector/ApproveEmployees';
import VehicleFuelApprovalPage from './Pages/MDirector/VehicleFuelApproval';
// Accounts Manager Page
import ACPurchaseOrderApproval from './Pages/AccountsM/PurchaseOrderPanyment';

// ✅ HR Pages
import RegisterEmployee from './Pages/HR/AddEmployee';
import AttendanceMark from './Pages/HR/Attendance';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected routes inside Layout */}
        <Route path="/" element={<Layout />}>
          {/* Store Manager Pages */}
          <Route index element={<IssueOutPage />} />
          <Route path="inventory/issue-out" element={<IssueOutPage />} />
          <Route path="inventory/stock-in" element={<StockInPage />} />
          <Route path="inventory/return-item" element={<ReturnedItemPage />} />
          <Route path="inventory/newitem" element={<NewItemPage />} />
          <Route path="inventory/purchase-order" element={<PurchaseOrderContainer />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />

          <Route path="reports/write" element={<WriteReportPage />} /> 
          <Route path="General/reports" element={<GeneralReportsPage />} />
          <Route path="Notifications" element={<NotificationsPage />} />

          {/* Managing Director Pages */}
          <Route path="orderapproval" element={<MDApprovalPage />} />
          <Route path="issueoutApproval" element={<IssueOutApprovalPage />} />
          < Route path='EmployeeApproval' element={<ApproveEmployees/>} />
          <Route path='VehicleFuelApproval' element={<VehicleFuelApprovalPage/>}/>

          {/* Accounts Manager Pages */}
          <Route path="payment" element={<ACPurchaseOrderApproval />} />

          {/* ✅ HR Pages */}
          <Route path="hr/employees/add" element={<RegisterEmployee />} />
          <Route path='hr/attendance' element={<AttendanceMark/>} />
          
          {/* Fallback */}
          <Route
            path="*"
            element={
              <div className="p-20 text-center text-xl text-gray-500">
                404 - Page Not Found
              </div>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

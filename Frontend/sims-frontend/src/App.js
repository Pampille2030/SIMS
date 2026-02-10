// src/App.js

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// General / Auth
import Login from "./Pages/General/Login";
import Layout from "./Components/Layout";
import Unauthorized from "./Pages/General/Unauthorized";
import ForgotPassword from "./Pages/Store/ForgotPassword";

// Store Manager Pages
import IssueOutPage from "./Pages/Store/Issuance/IssueOut";
import NewItemPage from "./Pages/Store/Inventory/NewItem";
import StockInPage from "./Pages/Store/Inventory/StockIn";
import ReturnedItemPage from "./Pages/Store/Inventory/ReturnedItem";
import ReportsPage from "./Pages/Store/Reports/InventoryReports";
import PurchaseOrderContainer from "./Pages/Store/PurchaseOrder/PurchaseorderContainer";
import InventoryStockPage from "./Pages/Store/Reports/StockQuantity";
import WriteReportPage from "./Pages/Store/Reports/WriteReportPage";
import PurchaseOrderRequestPage from "./Pages/Store/PurchaseOrder/PurchaseRequest";

// Shared / General
import GeneralReportsPage from "./Pages/Store/Reports/GeneralReport";
import NotificationsPage from "./Pages/General/Notification";

// Managing Director Pages
import MDApprovalPage from "./Pages/MDirector/PurchaseorderApproval";
import IssueOutApprovalPage from "./Pages/MDirector/IssueOutApproval";
import ApproveEmployees from "./Pages/MDirector/ApproveEmployees";
import VehicleFuelApprovalPage from "./Pages/MDirector/VehicleFuelApproval";
import MDPORequestPage from "./Pages/MDirector/POrequest";

// Accounts Manager Page
import ACPurchaseOrderApproval from "./Pages/AccountsM/PurchaseOrderPanyment";

// LIVESTOCK MANAGER
import LivestockDefinitionPage from "./Pages/LiveStockManager/AddCategory";

// HR Pages
import RegisterEmployee from "./Pages/HR/AddEmployee";
import AttendanceMark from "./Pages/HR/Attendance";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgotpassword" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route path="/" element={<Layout />}>
          {/* ✅ Store Manager ONLY */}
          <Route index element={<IssueOutPage />} />
          <Route path="inventory/issue-out" element={<IssueOutPage />} />
          <Route path="inventory/stock-in" element={<StockInPage />} />
          <Route path="inventory/return-item" element={<ReturnedItemPage />} />
          <Route path="inventory/newitem" element={<NewItemPage />} />
          <Route path="inventory/purchase-order" element={<PurchaseOrderContainer />} />
          <Route path='purchaserequest' element={<PurchaseOrderRequestPage/>}/>

          {/* 📦 Inventory Stock check */}
          <Route path="inventory/stock" element={<InventoryStockPage />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/write" element={<WriteReportPage />} />
          <Route path="General/reports" element={<GeneralReportsPage />} />
          <Route path="Notifications" element={<NotificationsPage />} />

          {/* Managing Director */}
          <Route path="orderapproval" element={<MDApprovalPage />} />
          <Route path="issueoutApproval" element={<IssueOutApprovalPage />} />
          <Route path="EmployeeApproval" element={<ApproveEmployees />} />
          <Route path="VehicleFuelApproval" element={<VehicleFuelApprovalPage />} />
          <Route path="PORequest" element={<MDPORequestPage />} />

          {/* Accounts */}
          <Route path="payment" element={<ACPurchaseOrderApproval />} />

          {/* HR */}
          <Route path="hr/employees/add" element={<RegisterEmployee />} />
          <Route path="hr/attendance" element={<AttendanceMark />} />

          {/* ✅ Livestock Manager */}
          <Route path="livestock/definition" element={<LivestockDefinitionPage />} />

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

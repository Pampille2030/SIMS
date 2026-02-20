// src/App.js
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import withRole from "./Utils/withRole";

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

// Accounts Manager Pages
import ACPurchaseOrderApproval from "./Pages/AccountsM/PurchaseOrderPanyment";
import RegisterEmployee from "./Pages/AccountsM/AddEmployee";

// Livestock Manager
import LivestockDefinitionPage from "./Pages/LiveStockManager/AddCategory";

// ---------------------------
// Role-Protected Pages
// ---------------------------

// Store Manager
const IssueOutPageProtected = withRole(IssueOutPage, ["storemanager"]);
const StockInPageProtected = withRole(StockInPage, ["storemanager"]);
const ReturnedItemPageProtected = withRole(ReturnedItemPage, ["storemanager"]);
const NewItemPageProtected = withRole(NewItemPage, ["storemanager"]);
const PurchaseOrderContainerProtected = withRole(PurchaseOrderContainer, ["storemanager"]);
const PurchaseOrderRequestPageProtected = withRole(PurchaseOrderRequestPage, ["storemanager"]);

// Reports (accessible by SM, MD, AC)
const InventoryStockPageProtected = withRole(InventoryStockPage, [
  "storemanager",
  "managingdirector",
  "accountsmanager",
]);
const ReportsPageProtected = withRole(ReportsPage, [
  "storemanager",
  "managingdirector",
  "accountsmanager",
]);
const WriteReportPageProtected = withRole(WriteReportPage, [
  "storemanager",
  "managingdirector",
  "accountsmanager",
]);
const GeneralReportsPageProtected = withRole(GeneralReportsPage, [
  "storemanager",
  "managingdirector",
  "accountsmanager",
]);

// Managing Director
const MDApprovalPageProtected = withRole(MDApprovalPage, ["managingdirector"]);
const IssueOutApprovalPageProtected = withRole(IssueOutApprovalPage, ["managingdirector"]);
const ApproveEmployeesProtected = withRole(ApproveEmployees, ["managingdirector"]);
const VehicleFuelApprovalPageProtected = withRole(VehicleFuelApprovalPage, ["managingdirector"]);
const MDPORequestPageProtected = withRole(MDPORequestPage, ["managingdirector"]);

// Accounts Manager
const ACPurchaseOrderApprovalProtected = withRole(ACPurchaseOrderApproval, ["accountsmanager"]);
const RegisterEmployeeProtected = withRole(RegisterEmployee, ["accountsmanager"]);

// Livestock Manager
const LivestockDefinitionPageProtected = withRole(LivestockDefinitionPage, ["livestockmanager"]);

// ---------------------------
// Token Expiration Check
// ---------------------------
const TokenChecker = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const decoded = jwtDecode(token);
          if (Date.now() > decoded.exp * 1000) {
            localStorage.clear();
            navigate("/login");
          }
        } catch (error) {
          localStorage.clear();
          navigate("/login");
        }
      }
    };

    checkToken();
    const interval = setInterval(checkToken, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  return <>{children}</>;
};

// ---------------------------
// App Component
// ---------------------------
function App() {
  return (
    <Router>
      <TokenChecker>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes */}
          <Route path="/" element={<Layout />}>
            {/* Store Manager */}
            <Route index element={<IssueOutPageProtected />} />
            <Route path="inventory/issue-out" element={<IssueOutPageProtected />} />
            <Route path="inventory/stock-in" element={<StockInPageProtected />} />
            <Route path="inventory/return-item" element={<ReturnedItemPageProtected />} />
            <Route path="inventory/newitem" element={<NewItemPageProtected />} />
            <Route path="inventory/purchase-order" element={<PurchaseOrderContainerProtected />} />
            <Route path="purchaserequest" element={<PurchaseOrderRequestPageProtected />} />

            {/* Reports (SM, MD, AC) */}
            <Route path="inventory/stock" element={<InventoryStockPageProtected />} />
            <Route path="reports" element={<ReportsPageProtected />} />
            <Route path="reports/write" element={<WriteReportPageProtected />} />
            <Route path="General/reports" element={<GeneralReportsPageProtected />} />

            {/* Managing Director */}
            <Route path="orderapproval" element={<MDApprovalPageProtected />} />
            <Route path="issueoutApproval" element={<IssueOutApprovalPageProtected />} />
            <Route path="EmployeeApproval" element={<ApproveEmployeesProtected />} />
            <Route path="VehicleFuelApproval" element={<VehicleFuelApprovalPageProtected />} />
            <Route path="PORequest" element={<MDPORequestPageProtected />} />

            {/* Accounts Manager */}
            <Route path="payment" element={<ACPurchaseOrderApprovalProtected />} />
            <Route path="accounts/employees/add" element={<RegisterEmployeeProtected />} />

            {/* Livestock Manager */}
            <Route path="livestock/definition" element={<LivestockDefinitionPageProtected />} />

            {/* Shared / General */}
            <Route path="Notifications" element={<NotificationsPage />} />

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
      </TokenChecker>
    </Router>
  );
}

export default App;

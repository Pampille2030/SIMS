import React, { useState, useEffect } from "react";
import api from "../../Utils/api";

const WriteReportPage = () => {
  const [form, setForm] = useState({
    subject: "",
    body: "",
    attachment: null,
    parent_report: null,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");

  const fetchReports = async () => {
    setTableLoading(true);
    try {
      const res = await api.get("reports/");
      const writtenReports = res.data.filter((r) => r.report_type === "written");
      setReports(writtenReports);
      setFilteredReports(writtenReports);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (!filterDate) {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter((r) => {
        const reportDate = new Date(r.created_at).toISOString().split("T")[0];
        return reportDate === filterDate;
      });
      setFilteredReports(filtered);
    }
  }, [filterDate, reports]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "attachment") {
      setForm({ ...form, attachment: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("subject", form.subject);
      formData.append("body", form.body);
      formData.append("report_type", "written");
      if (form.attachment) formData.append("attachment", form.attachment);
      if (form.parent_report) formData.append("parent_report", form.parent_report);

      await api.post("reports/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("Report submitted successfully.");
      setForm({ subject: "", body: "", attachment: null, parent_report: null });
      fetchReports();
    } catch (err) {
      console.error("Report submission error:", err);
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") setError(data);
        else if (data.detail) setError(data.detail);
        else setError(Object.values(data).flat().join(" | "));
      } else {
        setError("Failed to submit report. Check server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (report) => {
    setForm({
      subject: `Re: ${report.subject}`,
      body: `\n\n--- Original Message ---\n${report.body}`,
      attachment: null,
      parent_report: report.id,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded mt-6">
      <h1 className="text-3xl font-bold mb-6">
        {form.parent_report ? "Reply to Report" : "Submit Written Report"}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      >
        <div className="flex flex-col md:col-span-2">
          <label className="font-semibold mb-1">Subject</label>
          <input
            type="text"
            name="subject"
            value={form.subject}
            onChange={handleChange}
            placeholder="Enter report subject"
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4a533b]"
            required
          />
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="font-semibold mb-1">Body</label>
          <textarea
            name="body"
            value={form.body}
            onChange={handleChange}
            placeholder="Enter report details"
            className="border border-gray-300 rounded px-3 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-[#4a533b]"
            required
          />
        </div>

        <div className="flex flex-col md:col-span-2">
          <label className="font-semibold mb-1">Attachment (optional)</label>
          <input
            type="file"
            name="attachment"
            onChange={handleChange}
            accept="image/*,application/pdf"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-2 px-4 rounded transition"
            style={{ backgroundColor: "#4a533b" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#69795f")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#4a533b")
            }
          >
            {loading
              ? "Submitting..."
              : form.parent_report
              ? "Submit Reply"
              : "Submit Report"}
          </button>
        </div>
      </form>

      <div className="mb-4 flex items-center space-x-2">
        <label className="font-semibold">Filter by Date:</label>
        <input
          type="date"
          value={filterDate}
          max={today}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Clear
          </button>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-4">My Written Reports</h2>
      {tableLoading ? (
        <p>Loading reports...</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Subject</th>
              <th className="border p-2">Body</th>
              <th className="border p-2">Attachment</th>
              <th className="border p-2">Submitted At</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-4">
                  No written reports found
                </td>
              </tr>
            ) : (
              filteredReports.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.subject}</td>
                  <td className="border p-2">{r.body}</td>
                  <td className="border p-2">
                    {r.attachment ? (
                      <a
                        href={r.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4a533b] underline"
                      >
                        View
                      </a>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td className="border p-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="border p-2">
                    <button
                      type="button"
                      className="bg-[#4a533b] text-white px-3 py-1 rounded hover:brightness-90 transition"
                      onClick={() => handleReply(r)}
                    >
                      Reply
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WriteReportPage;

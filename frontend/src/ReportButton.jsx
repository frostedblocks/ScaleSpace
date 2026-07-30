import React, { useState } from "react";

/**
 * Simple Report button for posts.
 * Calls the backend reportPost(postId) method.
 */
export default function ReportButton({ actor, postId }) {
  const [status, setStatus] = useState(""); // "", "loading", "done", "error"
  const [message, setMessage] = useState("");

  const handleReport = async () => {
    if (!actor || status === "loading" || status === "done") return;

    const confirmed = window.confirm(
      "Report this post?\n\nIf enough people report it, the post will be hidden."
    );
    if (!confirmed) return;

    setStatus("loading");
    setMessage("");

    try {
      const result = await actor.reportPost(postId);
      setMessage(result);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setMessage("Failed to report. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      <button
        onClick={handleReport}
        disabled={status === "loading" || status === "done"}
        style={{
          background: "none",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "2px 8px",
          fontSize: "0.8rem",
          color: status === "done" ? "#888" : "#c00",
          cursor: status === "loading" || status === "done" ? "default" : "pointer",
        }}
      >
        {status === "loading" ? "Reporting…" : status === "done" ? "Reported" : "Report"}
      </button>

      {message && (
        <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#555" }}>
          {message}
        </span>
      )}
    </div>
  );
}

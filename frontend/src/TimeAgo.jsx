import React from "react";

/**
 * Converts a nanosecond timestamp from the ICP backend
 * into a human-readable relative time (e.g. "3 hours ago").
 */
export default function TimeAgo({ timestamp }) {
  if (!timestamp) return null;

  // ICP Time.now() returns nanoseconds since Unix epoch
  const ms = Number(timestamp) / 1_000_000;
  const now = Date.now();
  const diff = Math.max(0, now - ms);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let text;
  if (seconds < 60) text = "just now";
  else if (minutes < 60) text = `${minutes}m ago`;
  else if (hours < 24) text = `${hours}h ago`;
  else if (days < 7) text = `${days}d ago`;
  else {
    const date = new Date(ms);
    text = date.toLocaleDateString();
  }

  return (
    <span style={{ fontSize: "0.8rem", color: "#888" }} title={new Date(ms).toLocaleString()}>
      {text}
    </span>
  );
}

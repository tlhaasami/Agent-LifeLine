"use client";

import React, { useState, useRef } from "react";

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoPoster, setVideoPoster] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const videoRef = useRef(null);

  const handleVideoLoaded = (e) => {
    const video = e.target;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setVideoPoster(dataUrl);
    } catch (err) {
      // Ignore cross-origin canvas errors if any
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store auth session
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", data.role);

      if (onSuccess) {
        onSuccess(data.role);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Google Font Outfit Loader */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
      `}} />

      {/* Left Column: Login Form */}
      <div className="login-form-col">
        <div className="login-form-inner">
          {/* Logo / Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", marginBottom: "2rem" }}>
            <img src="/logo.png" alt="LifeLine Logo" style={{ height: "60px", width: "auto" }} />
            <h1 style={{
              margin: 0,
              fontSize: "2.4rem",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color: "#111827",
              fontFamily: "'Outfit', sans-serif"
            }}>
              LifeLine
            </h1>
          </div>

          <h2 style={{
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: "0.5rem",
            color: "#111827",
            letterSpacing: "-0.02em",
            fontFamily: "'Outfit', sans-serif"
          }}>
            Welcome Back
          </h2>
          <p style={{ color: "#4b5563", fontSize: "0.92rem", marginBottom: "2rem", lineHeight: "1.5", fontWeight: 500 }}>
            Enter your credentials to access the tracking dashboard.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.3rem" }}>
            {error && (
              <div style={{
                padding: "0.85rem 1.1rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "10px",
                color: "#dc2626",
                fontSize: "0.88rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                boxShadow: "0 2px 4px rgba(220, 38, 38, 0.05)"
              }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.55rem", color: "#374151" }}>
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
                style={{
                  width: "100%",
                  padding: "0.85rem 1.1rem",
                  borderRadius: "10px",
                  background: "#ffffff",
                  border: "1px solid #d1d5db",
                  color: "#111827",
                  fontSize: "0.95rem",
                  outline: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.55rem", color: "#374151" }}>
                Password
              </label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    padding: "0.85rem 3rem 0.85rem 1.1rem",
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: "1px solid #d1d5db",
                    color: "#111827",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "1rem",
                    background: "transparent",
                    border: "none",
                    color: "#4b5563",
                    cursor: "pointer",
                    fontSize: "1.15rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    outline: "none",
                    zIndex: 10
                  }}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="animated-btn"
              style={{
                width: "100%",
                padding: "0.9rem",
                borderRadius: "10px",
                backgroundColor: "#d15c2e",
                color: "white",
                fontWeight: 700,
                fontSize: "0.95rem",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.6rem",
                marginTop: "0.6rem",
                outline: "none",
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Verifying Session...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          <footer style={{ marginTop: "2.5rem", fontSize: "0.78rem", color: "#6b7280", fontWeight: 500 }}>
            LifeLine Systems &copy; {new Date().getFullYear()}. Secure administrator access.
          </footer>
        </div>
      </div>

      {/* Right Column: Logo Animation Video */}
      <div className="login-video-col">
        <video
          ref={videoRef}
          src="/logo-animation.mp4"
          poster={videoPoster || undefined}
          onLoadedData={handleVideoLoaded}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="login-bg-video"
        />
      </div>

      {/* Responsive Styles */}
      <style jsx global>{`
        .login-root {
          display: flex;
          min-height: 100vh;
          width: 100vw;
          background-color: #ffffff;
          color: #111827;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        .login-form-col {
          flex: 0 0 45%;
          width: 45%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 3.5rem 2.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
          border-right: 1px solid rgba(0, 0, 0, 0.08);
          z-index: 10;
          box-shadow: 10px 0 30px rgba(0, 0, 0, 0.05);
        }

        .login-form-inner {
          width: 100%;
          max-width: 380px;
        }

        .login-video-col {
          flex: 0 0 55%;
          width: 55%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #ffffff;
          overflow: hidden;
        }

        .login-bg-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        input:focus {
          border-color: #d15c2e !important;
          box-shadow: 0 0 0 3px rgba(209, 92, 46, 0.15) !important;
          background-color: #ffffff !important;
        }
        
        /* Premium Micro-Animated Sign In Button */
        .animated-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #e26939 0%, #d15c2e 100%) !important;
          box-shadow: 0 4px 14px rgba(209, 92, 46, 0.35);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }

        .animated-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: -50%;
          width: 200%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.25) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          transition: 0.75s ease-in-out;
          opacity: 0;
        }

        .animated-btn:hover {
          transform: translateY(-2px) scale(1.015);
          box-shadow: 0 8px 20px rgba(209, 92, 46, 0.55) !important;
          background: linear-gradient(135deg, #d15c2e 0%, #b84b20 100%) !important;
        }

        .animated-btn:hover::after {
          left: 125%;
          opacity: 1;
          transition: all 0.6s ease-in-out;
        }

        .animated-btn:active {
          transform: translateY(0) scale(0.985);
          box-shadow: 0 4px 10px rgba(209, 92, 46, 0.3) !important;
        }

        /* Mobile Layout (< 900px): Light Glass Card over background video */
        @media (max-width: 900px) {
          .login-root {
            position: relative !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 1.5rem !important;
            background-color: #ffffff !important;
          }

          .login-video-col {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 0 !important;
            background-color: #ffffff !important;
          }

          .login-form-col {
            flex: none !important;
            width: 100% !important;
            max-width: 440px !important;
            padding: 2.5rem 1.8rem !important;
            background: rgba(255, 255, 255, 0.65) !important;
            backdrop-filter: blur(14px) !important;
            -webkit-backdrop-filter: blur(14px) !important;
            border: 1px solid rgba(255, 255, 255, 0.6) !important;
            border-radius: 20px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12) !important;
            margin: auto !important;
            z-index: 10 !important;
          }

          .login-form-inner p, .login-form-inner h2, .login-form-inner footer {
            text-align: center !important;
          }

          .login-form-inner div:first-child {
            justify-content: center !important;
          }
        }
      `}</style>
    </div>
  );
}
